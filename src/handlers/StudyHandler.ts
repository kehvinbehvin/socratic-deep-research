import { BaseHandler } from './BaseHandler';
import { Topic } from '../entities/Topic';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';
import { DataSource } from 'typeorm';
import { QueueService } from '../services/QueueService';
import { z } from 'zod';

// Schema for API requests
export const StudyRequestSchema = z.object({
  content: z.string().min(1, 'Topic content is required')
});

export type StudyInput = z.infer<typeof StudyRequestSchema>;

export class StudyHandler extends BaseHandler<StudyInput, Topic> {
  constructor(queueService: QueueService, dataSource: DataSource) {
    super(queueService, dataSource, Topic, undefined, 'TOPIC');
  }

  // Public method for handling web requests
  public async handleRequest(input: StudyInput): Promise<Topic> {
    try {
      // Validate input
      StudyRequestSchema.parse(input);
      return this.process(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid study request: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Protected method for internal queue processing
  protected async process(input: StudyInput): Promise<Topic> {
    try {
      const topic = new Topic();
      topic.content = input.content;
      topic.status = ProcessingStatus.PENDING;

      // Save to database
      const savedTopic = await this.repository.save(topic);

      // Log success
      console.info(`Created new study topic with ID: ${savedTopic.id}`);

      return savedTopic;
    } catch (error) {
      console.error('Failed to process study request:', error);
      throw new Error('Failed to create study topic');
    }
  }
} 