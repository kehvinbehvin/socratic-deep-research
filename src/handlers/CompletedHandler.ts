import { BaseHandler } from './BaseHandler';
import { Review } from '../entities/Review';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';
import { Topic } from '../entities/Topic';

interface CompletedInput {
  reviewResultId: string;
}

export class CompletedHandler extends BaseHandler<CompletedInput, Topic> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      Topic,
      QUEUE_NAMES.COMPLETE
    );
    this.openAIService = openAIService;
  }

  protected async process(input: CompletedInput): Promise<Topic> {
    // Get the review result
    const review = await this.dataSource
      .getRepository(Review)
      .findOne({
        where: { id: input.reviewResultId },
        relations: ['topic']
      });

    if (!review) {
      throw new Error(`Review result not found: ${input.reviewResultId}`);
    }


    const topic = await this.dataSource
      .getRepository(Topic)
      .findOne({
        where: { id: review.topic.id }
      });

    if (!topic) {
      throw new Error(`Topic not found: ${review.topic.id}`);
    }

    topic.status = ProcessingStatus.COMPLETED;

    // TODO: Run any clean up logic or post topic processing logic

    // Save to database
    const savedTopic = await this.repository.save(topic);

    return savedTopic;
  }
} 