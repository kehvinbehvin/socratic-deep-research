import { BaseHandler } from './BaseHandler';
import { Question } from '../entities/Question';
import { Reflection } from '../entities/Reflection';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
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

export class QuestionHandler extends BaseHandler<QuestionInput, Reflection> {
  constructor(
    queueService: QueueService,
    dataSource: DataSource
  ) {
    super(
      queueService,
      dataSource,
      Reflection,
      QUEUE_NAMES.QUESTION,
      QUEUE_NAMES.REFLECTION
    );
  }

  protected async transformQueueMessage(message: any): Promise<QuestionInput> {
    // Extract just the fields we need from the queue message
    const { id, content, topicId } = message.entity;
    return { id, content, topicId };
  }

  protected async process(input: QuestionInput): Promise<Reflection> {
    // If this is a queued question
    if ('id' in input) {
      const question = await this.dataSource
        .getRepository(Question)
        .findOne({ 
          where: { id: input.id },
          relations: ['topic']
        });

      if (!question) {
        throw new Error(`Question not found: ${input.id}`);
      }

      // Create reflection for the question
      const reflection = new Reflection();
      reflection.content = `Initial reflection on: ${question.content}`;
      reflection.question = question;
      reflection.status = ProcessingStatus.PENDING;

      return reflection;
    }

    // If this is a new question (from API)
    const question = new Question();
    question.content = input.content;
    question.topicId = input.topicId;
    question.status = ProcessingStatus.PENDING;

    // Save the question first
    const savedQuestion = await this.dataSource
      .getRepository(Question)
      .save(question);

    // Create initial reflection
    const reflection = new Reflection();
    reflection.content = `Initial reflection on: ${input.content}`;
    reflection.question = savedQuestion;
    reflection.status = ProcessingStatus.PENDING;

    return reflection;
  }
} 