import { BaseHandler } from './BaseHandler';
import { Topic } from '../entities/Topic';
import { TopicDTO } from '../types/dtos';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';
import { DataSource } from 'typeorm';
import { QueueService } from '../services/QueueService';

interface StudyInput {
  content: string;
}

export class StudyHandler extends BaseHandler<StudyInput, Topic> {
  constructor(queueService: QueueService, dataSource: DataSource) {
    super(queueService, dataSource, Topic, undefined, QUEUE_NAMES.TOPIC);
  }

  // Public method for handling web requests
  public async handleRequest(input: StudyInput): Promise<Topic> {
    return this.process(input);
  }

  // Protected method for internal queue processing
  protected async process(input: StudyInput): Promise<Topic> {
    const topic = new Topic();
    topic.content = input.content;
    topic.status = ProcessingStatus.PENDING;

    // Save to database
    const savedTopic = await this.repository.save(topic);

    return savedTopic;
  }
} 