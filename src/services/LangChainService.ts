import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

export class LangChainService {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: "gpt-4-turbo-preview",
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
      maxTokens: 2000,
    });
  }

  async generateStructured<T extends z.ZodType>(params: {
    systemPrompt: string;
    userPrompt: string;
    schema: T;
    input: Record<string, any>;
  }): Promise<z.infer<T>> {
    try {
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", params.systemPrompt],
        ["human", params.userPrompt],
      ]);

      const outputParser = new JsonOutputParser<z.infer<T>>();

      const chain = RunnableSequence.from([
        prompt,
        this.model,
        outputParser,
      ]);

      const response = await chain.invoke(params.input);

      // Validate response against schema
      const validatedResponse = params.schema.parse(response);
      return validatedResponse;
    } catch (error) {
      console.error('LangChain error:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`LLM output validation failed: ${error.message}`);
      }
      throw new Error(`LLM generation failed: ${(error as Error).message}`);
    }
  }
} 