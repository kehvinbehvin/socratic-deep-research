import { BaseHandler } from './QueueHandler';
import { Review } from '../entities/Review';
import { Topic } from '../entities/Topic';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { ProcessingStatus } from '../entities/BaseEntity';
import { z } from 'zod';

// Schema for queue messages
export const CompletedQueueSchema = z.object({
  id: z.string().uuid(),
  reviewId: z.string().uuid()
});

export type CompletedQueueInput = z.infer<typeof CompletedQueueSchema>;

export class CompletedHandler extends BaseHandler<CompletedQueueInput, Topic> {
  constructor(queueService: QueueService, dataSource: DataSource) {
    super(queueService, dataSource, Topic, 'COMPLETE', undefined);
  }

  protected async transformQueueMessage(message: any): Promise<CompletedQueueInput> {
    // Extract just the fields we need from the queue message
    const { id, reviewId } = message.entity;
    return { id, reviewId };
  }

  protected async process(input: CompletedQueueInput): Promise<Topic> {
    const review = await this.dataSource
      .getRepository(Review)
      .findOne({
        where: { id: input.id },
        relations: [
          'crawlResult',
          'crawlResult.searchResult',
          'crawlResult.searchResult.searchQuery',
          'crawlResult.searchResult.searchQuery.queryPreparation',
          'crawlResult.searchResult.searchQuery.queryPreparation.clarification',
          'crawlResult.searchResult.searchQuery.queryPreparation.clarification.reflection',
          'crawlResult.searchResult.searchQuery.queryPreparation.clarification.reflection.question',
          'crawlResult.searchResult.searchQuery.queryPreparation.clarification.reflection.question.topic'
        ]
      });

    if (!review) {
      throw new Error(`Review not found: ${input.id}`);
    }

    // Get the topic through the relationship chain
    const topic = review.crawlResult.searchResult.searchQuery.queryPreparation.clarification.reflection.question.topic;

    // Update topic status to completed
    topic.status = ProcessingStatus.COMPLETED;
    const updatedTopic = await this.dataSource.getRepository(Topic).save(topic);

    // Log completion
    console.info(`Study completed for topic: ${topic.id}`);

    return updatedTopic;
  }
} 