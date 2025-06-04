import { Review } from '../entities/Review';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { QueueHandler } from './QueueHandler';
import { ReviewStageData, GenericQueueDTO, CompleteStageData } from '../types/dtos';
import { Topic } from '../entities';

export class ReviewHandler extends QueueHandler<ReviewStageData, CompleteStageData, Review> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      Review,
      'REVIEW',
      'COMPLETE'
    );
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(entities: Review[], prevMessage: GenericQueueDTO<ReviewStageData>): Promise<GenericQueueDTO<CompleteStageData>> {
    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: {
        ...prevMessage.previousStages,
        reviews: entities.map(entity => entity.id)
      },
      currentStage: {
        complete: entities.map(entity => entity.chunkId)
      }
    }
  }

  protected async process(input: GenericQueueDTO<ReviewStageData>): Promise<Review[]> {
    // Create mock reviews
    const mockReviews = [
      {
        chunkId: "chunk1",
        relevance: 0.95,
        content: "The implementation methodology shows strong potential for scalability across different domains."
      },
      {
        chunkId: "chunk2",
        relevance: 0.88,
        content: "Performance metrics indicate significant improvements over traditional approaches."
      },
      {
        chunkId: "chunk3",
        relevance: 0.92,
        content: "Integration with existing systems can be achieved through standardized protocols."
      },
      {
        chunkId: "chunk4",
        relevance: 0.85,
        content: "Regulatory compliance frameworks provide clear guidelines for implementation."
      },
      {
        chunkId: "chunk5",
        relevance: 0.90,
        content: "Recent case studies demonstrate successful adoption in various industries."
      }
    ];

    // Create and save review entities
    const reviews = await Promise.all(
      mockReviews.map(async ({ chunkId, relevance, content }) => {
        const review = new Review();
        review.chunkId = chunkId;
        review.relevance = relevance;
        const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ where: { id: input.core.topicId }});
        review.topic = topic;
        return await this.dataSource.getRepository(Review).save(review);
      })
    );

    return reviews;
  }
} 