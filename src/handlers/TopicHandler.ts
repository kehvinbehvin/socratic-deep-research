import { BaseHandler } from './BaseHandler';
import { Topic } from '../entities/Topic';
import { TopicDTO } from '../types/dtos';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';
import { DataSource } from 'typeorm';
import { QueueService } from '../services/QueueService';

interface TopicInput {
  content: string;
}

export class TopicHandler extends BaseHandler<TopicInput, Topic> {
  constructor(queueService: QueueService, dataSource: DataSource) {
    super(
      queueService,
      dataSource,
      Topic,
      QUEUE_NAMES.TOPIC,
      QUEUE_NAMES.QUESTION
    );
  }

  protected async process(input: TopicInput): Promise<Topic> {
    // Create a new topic entity
    const topic = new Topic();
    topic.content = input.content;
    topic.status = ProcessingStatus.PROCESSING;

    // In a real implementation, we might:
    // 1. Validate the topic content
    // 2. Clean/normalize the text
    // 3. Perform initial topic analysis
    // 4. Add metadata or tags
    
    return topic;
  }
} 