import { BaseHandler } from './BaseHandler';
import { Reflection } from '../entities/Reflection';
import { Clarification } from '../entities/Clarification';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { ProcessingStatus } from '../entities/BaseEntity';
import { z } from 'zod';

// Schema for API requests
export const CreateReflectionSchema = z.object({
  questionId: z.string().uuid(),
  content: z.string().min(1)
});

// Schema for queue messages
export const ReflectionQueueSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  questionId: z.string().uuid()
});

export type CreateReflectionInput = z.infer<typeof CreateReflectionSchema>;
export type ReflectionQueueInput = z.infer<typeof ReflectionQueueSchema>;

// Union type for all possible inputs
export type ReflectionInput = CreateReflectionInput | ReflectionQueueInput;

export class ReflectionHandler extends BaseHandler<ReflectionQueueInput, Reflection> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      Reflection,
      'REFLECTION',
      'CLARIFICATION'
    );
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(message: any): Promise<ReflectionQueueInput> {
    // Extract just the fields we need from the queue message
    const { id, content, questionId } = message.entity;
    return { id, content, questionId };
  }

  protected async process(input: ReflectionQueueInput): Promise<Reflection> {
    // Implementation here...
    return {} as Reflection; // Placeholder
  }
} 