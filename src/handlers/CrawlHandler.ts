import { CrawlResult } from '../entities/CrawlResult';
import { QueueService } from '../services/QueueService';
import { FireCrawlService } from '../services/FireCrawlService';
import { S3Service } from '../services/S3Service';
import { DataSource } from 'typeorm';
import { CrawlResultStageData, GenericQueueDTO, ReviewStageData } from '../types/dtos';
import { QueueHandler } from './QueueHandler';
import { Review } from '../entities/Review';

export class CrawlHandler extends QueueHandler<CrawlResultStageData, ReviewStageData, Review> {
  private fireCrawlService: FireCrawlService;
  private s3Service: S3Service;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    fireCrawlService: FireCrawlService,
    s3Service: S3Service
  ) {
    super(
      queueService,
      dataSource,
      CrawlResult,
      'CRAWL',
      'REVIEW'
    );
    this.fireCrawlService = fireCrawlService;
    this.s3Service = s3Service;
  }

  protected async transformQueueMessage(entities: Review[], prevMessage: GenericQueueDTO<CrawlResultStageData>): Promise<GenericQueueDTO<ReviewStageData>> {
    // Extract just the fields we need from the queue message
    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: {
        ...prevMessage.previousStages,
        crawlResults: entities.map(entity => entity.id)
      },
      currentStage: {
        reviews: entities.map(entity => entity.id)
      }
    }
  }

  protected async process(input: GenericQueueDTO<CrawlResultStageData>): Promise<Review[]> {
    // TODO: Integrate with llm to score relevance of the crawl results
    // TODO: Integrate with text spliiter to chunk text and store in vector db

    return [] as Review[];
  }
} 