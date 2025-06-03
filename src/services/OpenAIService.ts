import { OpenAI } from 'openai';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';
import { LoggerService } from './LoggerService';

const QuestionsResponseSchema = z.object({
  questions: z.array(z.string())
});

export class OpenAIService {
  private client: OpenAI;
  private logger: LoggerService;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
    this.logger = LoggerService.getInstance();
  }

  async generateText(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    return response.choices[0].message.content || '';
  }

  async generateStructuredOutput<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that always responds in valid JSON format.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in response');
    }

    const parsed = JSON.parse(content);
    return schema.parse(parsed);
  }

  async generateQuestions(prompt: string): Promise<string[]> {
    const response = await this.generateStructuredOutput(
      `${prompt}\n\nRespond with a JSON object containing an array of questions.`,
      QuestionsResponseSchema
    );
    return response.questions;
  }
} 