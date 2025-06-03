import { BaseHandler } from './BaseHandler';
import { Question } from '../entities/Question';
import { Reflection } from '../entities/Reflection';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { ProcessingStatus } from '../entities/BaseEntity';
import { z } from 'zod';

// Schema for API requests
export const CreateQuestionSchema = z.object({
  topicId: z.string().uuid(),
  content: z.string().min(1)
});

// Schema for queue messages
export const QuestionQueueSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  topicId: z.string().uuid()
});

export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
export type QuestionQueueInput = z.infer<typeof QuestionQueueSchema>;

// Union type for all possible inputs
export type QuestionInput = CreateQuestionInput | QuestionQueueInput;

export class QuestionHandler extends BaseHandler<QuestionQueueInput, Question> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      Question,
      'QUESTION',
      'REFLECTION'
    );
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(message: any): Promise<QuestionQueueInput> {
    // Extract just the fields we need from the queue message
    const { id, content, topicId } = message.entity;
    return { id, content, topicId };
  }

  protected async process(input: QuestionQueueInput): Promise<Question> {
    // Implementation here...
    return {} as Question; // Placeholder
  }
} 