import { BaseHandler } from './BaseHandler';
import { Reflection } from '../entities/Reflection';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';
import { Clarification } from '../entities/Clarification';

interface ReflectionInput {
  reflectionId: string;
  content: string;
}

export class ReflectionHandler extends BaseHandler<ReflectionInput, Clarification> {
  constructor(queueService: QueueService, dataSource: DataSource) {
    super(queueService, dataSource, Reflection, QUEUE_NAMES.REFLECTION, QUEUE_NAMES.CLARIFICATION);
  }

  // Public method for handling web/API requests
  public async handleRequest(input: ReflectionInput): Promise<Clarification> {
    return this.process(input);
  }

  // Protected method for internal queue processing
  protected async process(input: ReflectionInput): Promise<Clarification> {
    const reflection = await this.dataSource
      .getRepository(Reflection)
      .findOne({ where: { id: input.reflectionId } });

    if (!reflection) {
      throw new Error(`Reflection not found: ${input.reflectionId}`);
    }

    const clarification = new Clarification();
    clarification.content = input.content;
    clarification.reflection = reflection;
    clarification.status = ProcessingStatus.PENDING;

    // TODO: Implement clarification processing logic
    // This will involve:
    // 1. Using Langgraph to generate a clarification from the reflection, question and topic

    // Save to database
    const savedClarification = await this.repository.save(clarification);

    return savedClarification;
  }
} 