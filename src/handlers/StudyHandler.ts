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

  // Protected method for internal queue processing
  protected async process(input: StudyInput): Promise<Topic> {
    try {
      const topic = new Topic();
      topic.content = input.content;
      topic.status = ProcessingStatus.PENDING;

      return topic;
    } catch (error) {
      console.error('Failed to process study request:', error);
      throw new Error('Failed to create study topic');
    }
  }
} 