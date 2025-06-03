import { BaseHandler } from './BaseHandler';
import { Review } from '../entities/Review';
import { CrawlResult } from '../entities/CrawlResult';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';

interface ReviewInput {
  crawlResultId: string;
}

export class ReviewHandler extends BaseHandler<ReviewInput, Review> {
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
      QUEUE_NAMES.REVIEW,
      QUEUE_NAMES.COMPLETE
    );
    this.openAIService = openAIService;
  }

  protected async process(input: ReviewInput): Promise<Review> {
    // Get the crawl result
    const crawlResult = await this.dataSource
      .getRepository(CrawlResult)
      .findOne({
        where: { id: input.crawlResultId },
        relations: ['searchResult', 'searchResult.queryPreparation']
      });

    if (!crawlResult) {
      throw new Error(`Crawl result not found: ${input.crawlResultId}`);
    }

    // Create review entity
    const review = new Review();
    review.crawlResult = crawlResult;
    review.status = ProcessingStatus.PENDING;

    // TODO: Implement review logic
    // This will involve:
    // 1. Getting content from S3 for each crawled URL
    // 2. Using OpenAI to analyze the content
    // 3. Generating a comprehensive review
    // 4. Storing the review results

    return review;
  }
} 