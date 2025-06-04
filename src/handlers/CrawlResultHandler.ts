import { CrawlResult } from '../entities/CrawlResult';
import { QueueService } from '../services/QueueService';
import { S3Service } from '../services/S3Service';
import { DataSource } from 'typeorm';
import { CrawlResultStageData, GenericQueueDTO, ReviewStageData, TopicStageData } from '../types/dtos';
import { Review } from '../entities/Review';
import { Topic } from '../entities';
import { QueueHandler } from './QueueHandler';

export class CrawlResultHandler extends QueueHandler<CrawlResultStageData, ReviewStageData, Review> {
  private s3Service: S3Service;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    s3Service: S3Service
  ) {
    super(
      queueService,
      dataSource,
      CrawlResult,
      'CRAWL',
      'REVIEW'
    );
    this.s3Service = s3Service;
  }

  protected async transformQueueMessage(entities: Review[], prevMessage: GenericQueueDTO<CrawlResultStageData>): Promise<GenericQueueDTO<ReviewStageData>> {
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
        reviews: entities.map(entity => entity.chunkId)
      }
    }
  }

  protected async process(input: GenericQueueDTO<CrawlResultStageData>): Promise<Review[]> {
    // First create mock crawl results
    const mockCrawls = [
      {
        url: "https://example.com/implementation-guide",
        reliability: 0.92
      },
      {
        url: "https://research.org/metrics",
        reliability: 0.88
      },
      {
        url: "https://tech.edu/integration",
        reliability: 0.95
      },
      {
        url: "https://compliance.org/standards",
        reliability: 0.87
      },
      {
        url: "https://industry.com/case-studies",
        reliability: 0.90
      }
    ];

    // Create and save crawl result entities
    const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ where: { id: input.core.topicId }});
    
    const crawlResults = await Promise.all(
      mockCrawls.map(async ({ url, reliability }) => {
        const crawlResult = new CrawlResult();
        crawlResult.url = url;
        crawlResult.reliability = reliability;
        crawlResult.topic = topic;
        return await this.dataSource.getRepository(CrawlResult).save(crawlResult);
      })
    );

    // Now create mock reviews based on the crawl results
    const mockReviews = [
      {
        chunkId: "implementation_1",
        content: "The implementation methodology follows a systematic approach with clear phases: planning, execution, and validation. Each phase incorporates industry best practices and allows for customization based on specific requirements.",
        relevance: 0.94
      },
      {
        chunkId: "metrics_1",
        content: "Key performance indicators include system response time, throughput, and error rates. The metrics framework provides comprehensive coverage of both functional and non-functional requirements.",
        relevance: 0.89
      },
      {
        chunkId: "integration_1",
        content: "Integration protocols support both REST and GraphQL APIs, with built-in security measures including OAuth2 authentication and rate limiting. The system handles data transformation and validation automatically.",
        relevance: 0.91
      },
      {
        chunkId: "compliance_1",
        content: "Compliance requirements cover data privacy (GDPR, CCPA), security standards (ISO 27001), and industry-specific regulations. Regular audits and automated compliance checks are built into the workflow.",
        relevance: 0.87
      },
      {
        chunkId: "casestudy_1",
        content: "Case studies from Fortune 500 companies demonstrate successful implementations across finance, healthcare, and technology sectors. ROI metrics show average efficiency improvements of 35%.",
        relevance: 0.93
      }
    ];

    // Create and save review entities with links to crawl results
    const reviews = await Promise.all(
      mockReviews.map(async ({ chunkId, content, relevance }, index) => {
        const review = new Review();
        review.chunkId = chunkId;
        review.content = content;
        review.relevance = relevance;
        review.topic = topic;
        review.crawlResult = crawlResults[index]; // Link each review to a crawl result
        
        // Set up bidirectional relationship
        crawlResults[index].review = review;
        await this.dataSource.getRepository(CrawlResult).save(crawlResults[index]);
        
        return await this.dataSource.getRepository(Review).save(review);
      })
    );

    return reviews;
  }
} 