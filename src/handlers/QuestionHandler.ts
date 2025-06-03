import { BaseHandler } from './BaseHandler';
import { Clarification } from '../entities/Clarification';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';
import { Reflection } from '../entities/Reflection';
import { Question } from '../entities/Question';

interface QuestionInput {
  questionId: string;
  topicId: string;
  content: string;
}

export class QuestionHandler extends BaseHandler<QuestionInput, Reflection> {
  constructor(queueService: QueueService, dataSource: DataSource) {
    super(queueService, dataSource, Reflection, QUEUE_NAMES.QUESTION, QUEUE_NAMES.REFLECTION);
  }

  // Public method for handling web/API requests
  public async handleRequest(input: QuestionInput): Promise<Reflection> {
    return this.process(input);
  }

  // Protected method for internal queue processing
  protected async process(input: QuestionInput): Promise<Reflection> {
    const question = await this.dataSource
      .getRepository(Question)
      .findOne({ where: { id: input.questionId } });

    if (!question) {
      throw new Error(`Question not found: ${input.questionId}`);
    }

    const reflection = new Reflection();
    reflection.content = input.content;
    reflection.question = question;
    reflection.status = ProcessingStatus.PENDING;

    // TODO: Implement reflection processing logic
    // This will involve:
    // 1. Using Langgraph to generate a reflection based on the question and the topic

    // Save to database
    const savedReflection = await this.repository.save(reflection);

    return savedReflection;
  }
} 