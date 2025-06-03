import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';
import { LoggerService } from './LoggerService';

export class OpenAIService {
  private model: ChatOpenAI;
  private logger: LoggerService;

  constructor(apiKey: string) {
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7
    });
    this.logger = LoggerService.getInstance();
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const response = await this.model.invoke(prompt);
      return response.content.toString();
    } catch (error) {
      this.logger.error('Error generating text with OpenAI', {
        error: error instanceof Error ? error.stack : String(error),
        prompt
      });
      throw error;
    }
  }

  async generateStructuredOutput<T extends z.ZodType>(
    prompt: string,
    schema: T
  ): Promise<z.infer<T>> {
    try {
      const parser = StructuredOutputParser.fromZodSchema(schema);
      const formatInstructions = parser.getFormatInstructions();

      const promptTemplate = PromptTemplate.fromTemplate(`
        {prompt}

        {format_instructions}

        Let's approach this step-by-step:
        1. Understand the requirements from the prompt
        2. Generate the content following the format
        3. Validate the output matches the schema
        4. Return the structured result
      `);

      const chain = RunnableSequence.from([
        promptTemplate,
        this.model,
        parser
      ]);

      const response = await chain.invoke({
        prompt,
        format_instructions: formatInstructions
      });

      return response;
    } catch (error) {
      this.logger.error('Error generating structured output with OpenAI', {
        error: error instanceof Error ? error.stack : String(error),
        prompt
      });
      throw error;
    }
  }
} 