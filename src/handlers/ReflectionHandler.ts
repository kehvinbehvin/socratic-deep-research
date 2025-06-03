import { BaseHandler } from './BaseHandler';
import { Reflection } from '../entities/Reflection';
import { Clarification } from '../entities/Clarification';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
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

export class ReflectionHandler extends BaseHandler<ReflectionInput, Clarification> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      Clarification,
      QUEUE_NAMES.REFLECTION,
      QUEUE_NAMES.CLARIFICATION
    );
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(message: any): Promise<ReflectionInput> {
    // Extract just the fields we need from the queue message
    const { id, content, questionId } = message.entity;
    return { id, content, questionId };
  }

  protected async process(input: ReflectionInput): Promise<Clarification> {
    // If this is a queued reflection
    if ('id' in input) {
      const reflection = await this.dataSource
        .getRepository(Reflection)
        .findOne({
          where: { id: input.id },
          relations: ['question', 'question.topic']
        });

      if (!reflection) {
        throw new Error(`Reflection not found: ${input.id}`);
      }

      // Generate clarifying questions using OpenAI
      const prompt = `Given the topic "${reflection.question.topic.content}" and the reflection "${reflection.content}", 
        generate a clarifying question to deepen understanding.`;
      
      const clarifyingQuestion = await this.openAIService.generateText(prompt);

      // Create clarification
      const clarification = new Clarification();
      clarification.content = clarifyingQuestion;
      clarification.reflection = reflection;
      clarification.status = ProcessingStatus.PENDING;

      return clarification;
    }

    // If this is a new reflection (from API)
    const reflection = new Reflection();
    reflection.content = input.content;
    reflection.questionId = input.questionId;
    reflection.status = ProcessingStatus.PENDING;

    // Save the reflection first
    const savedReflection = await this.dataSource
      .getRepository(Reflection)
      .save(reflection);

    // Create initial clarification
    const clarification = new Clarification();
    clarification.content = `Initial clarification needed for: ${input.content}`;
    clarification.reflection = savedReflection;
    clarification.status = ProcessingStatus.PENDING;

    return clarification;
  }
} 