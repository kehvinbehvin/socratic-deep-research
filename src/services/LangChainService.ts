import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { LoggerService } from "./LoggerService";
import { CentralizedMetricsService } from "./CentralisedMetricsService";
import { MetricDefinitions } from "../metrics/definitions";
import { QdrantVectorStoreService } from "./QdrantVectorStoreService";

export class LangChainService {
  private model: ChatOpenAI;
  private logger: LoggerService;
  private metrics: CentralizedMetricsService;
  private modelName: string;
  private qdrantService: QdrantVectorStoreService;
  
  constructor(logger: LoggerService, metrics: CentralizedMetricsService, qdrantService: QdrantVectorStoreService) {
    this.modelName = "gpt-4o-mini";
    this.model = new ChatOpenAI({
      modelName: this.modelName,
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
      maxTokens: 2000,
    });
    this.logger = logger;
    this.metrics = metrics;
    this.qdrantService = qdrantService;
  }

  async generateStructured<T extends z.ZodType>(params: {
    systemPrompt: string;
    userPrompt: string;
    schema: T;
    input: Record<string, any>;
    useRetrieval?: boolean;
    searchQuery?: string;
    topK?: number;
  }): Promise<z.infer<T>> {
    const startTime = Date.now();
    const endpoint = 'langchain_generate_structured';
    const service = 'langchain';

    try {
      let contextualPrompt = params.systemPrompt;

      // Perform retrieval if requested and qdrantService is available
      if (params.useRetrieval && params.searchQuery) {
        this.logger.info('Retrieval requested');
        
        const searchResults = await this.qdrantService.searchText(
          params.searchQuery,
          params.topK || 5
        );

        // Add retrieved context to system prompt
        if (searchResults.length > 0) {
          this.logger.info('Context retrieved', { searchResultsLength: searchResults.length });

          const context = searchResults
            .map(r => `Content: ${r.text?.replace(/[{}]/g, '')}\nRelevance: ${r.score.toFixed(2)}`)
            .join('\n\n');
          
          contextualPrompt = `${params.systemPrompt}\n\nRelevant Context:\n${context}\n\nUse the above context to inform your response.`;
        }
      }

      const prompt = ChatPromptTemplate.fromMessages([
        ["system", `${contextualPrompt}`],
        ["human", params.userPrompt],
      ]);

      const modelWithStructure = this.model.withStructuredOutput(params.schema);

      const chain = RunnableSequence.from([
        prompt,
        modelWithStructure,
      ]);

      this.metrics.observe(MetricDefinitions.usage.apiCalls, 1, {
        service: service,
        endpoint: endpoint,
        operation: 'langchain_generate_structured_attempt',
      });

      const response = await chain.invoke(params.input);

      const tokens = response.usage?.total_tokens;
      this.metrics.observe(MetricDefinitions.usage.tokens, tokens, {
        service: service,
        model: this.modelName,
        operation: 'langchain_generate_tokens',
      });

      // We don't want to increment the api calls metric for successful calls since we already did that in the attempt
      this.metrics.observe(MetricDefinitions.usage.apiCalls, 0, {
        service: service,
        endpoint: endpoint,
        operation: 'langchain_generate_structured_success',
      });

      const duration = (Date.now() - startTime)
      this.metrics.observe(MetricDefinitions.usage.duration, duration, {
        service: service,
        endpoint: endpoint,
        status: 'success'
      });

      // Validate response against schema
      const validatedResponse = params.schema.parse(response);

      return validatedResponse;
    } catch (error) {
      const duration = (Date.now() - startTime)
      this.metrics.observe(MetricDefinitions.usage.duration, duration, {
        service: service,
        endpoint: endpoint,
        status: 'error'
      });

      this.metrics.observe(MetricDefinitions.error.errorCount, 1, {
        service: service,
        category: 'langchain_generate_error',
        message: error instanceof Error ? error.message : 'unknown',
        type: error instanceof Error ? error.name : 'unknown'
      });

      this.logger.error('LangChain error:', {
        error: error instanceof Error ? error.stack : String(error),
        input: params.input
      });

      if (error instanceof z.ZodError) {
        throw new Error(`LLM output validation failed: ${error.message}`);
      }

      throw new Error(`LLM generation failed: ${(error as Error).message}`);
    }
  }
} 