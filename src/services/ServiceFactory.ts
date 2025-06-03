import { DataSource } from 'typeorm';
import { QueueService } from './QueueService';
import { StudyHandler } from '../handlers/StudyHandler';
import { QuestionHandler } from '../handlers/QuestionHandler';
import { TopicHandler } from '../handlers/TopicHandler';
import { ReflectionHandler } from '../handlers/ReflectionHandler';
import { ClarificationHandler } from '../handlers/ClarificationHandler';
import { OpenAIService } from './OpenAIService';
import { QueryPreparationHandler } from '../handlers/QueryPreparationHandler';
import { SearchHandler } from '../handlers/SeachHandler';
import { CrawlHandler } from '../handlers/CrawlHandler';
import { FireCrawlService } from './FireCrawlService';
import { ReviewHandler } from '../handlers/ReviewHandler';
import { SerpApiService } from './SerpApiService';
import { S3Service } from './S3Service';
import { CompletedHandler } from '../handlers/CompletedHandler';
import { LoggerService } from './LoggerService';

export class ServiceFactory {
  private static instance: ServiceFactory | null = null;
  private dataSource: DataSource;
  private queueService: QueueService;
  private handlers: Map<string, any>;
  private fireCrawlService: FireCrawlService | null = null;
  private s3Service: S3Service | null = null;
  private openAIService: OpenAIService;

  private constructor(dataSource: DataSource, queueService: QueueService) {
    this.dataSource = dataSource;
    this.queueService = queueService;
    this.handlers = new Map();
    this.openAIService = new OpenAIService(process.env.OPENAI_API_KEY || '');
  }

  static async initialize(dataSource: DataSource): Promise<ServiceFactory> {
    if (!ServiceFactory.instance) {
      const queueService = new QueueService();
      await queueService.initialize();
      ServiceFactory.instance = new ServiceFactory(dataSource, queueService);
    }
    return ServiceFactory.instance;
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }

  getQueueService(): QueueService {
    return this.queueService;
  }

  getOpenAIService(): OpenAIService {
    return this.openAIService;
  }

  getTopicHandler(): TopicHandler {
    const handlerKey = 'topic';
    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(
        handlerKey,
        new TopicHandler(this.queueService, this.dataSource, this.getOpenAIService())
      );
    }
    return this.handlers.get(handlerKey);
  }

  getQuestionHandler(): QuestionHandler {
    const handlerKey = 'question';
    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(
        handlerKey,
        new QuestionHandler(this.queueService, this.dataSource)
      );
    }
    return this.handlers.get(handlerKey);
  }

  getReflectionHandler(): ReflectionHandler {
    const handlerKey = 'reflection';
    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(
        handlerKey,
        new ReflectionHandler(this.queueService, this.dataSource)
      );
    }
    return this.handlers.get(handlerKey);
  }

  getClarificationHandler(): ClarificationHandler {
    const handlerKey = 'clarification';
    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(
        handlerKey,
        new ClarificationHandler(this.queueService, this.dataSource, this.getOpenAIService())
      );
    }
    return this.handlers.get(handlerKey);
  }

  getQueryPreparationHandler(): QueryPreparationHandler {
    const handlerKey = 'queryPreparation';
    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(
        handlerKey,
        new QueryPreparationHandler(
          this.queueService, 
          this.dataSource,
          new SerpApiService(process.env.SERP_API_KEY || '')
        )
      );
    }
    return this.handlers.get(handlerKey);
  }

  getSearchHandler(): SearchHandler {
    const handlerKey = 'search';
    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(
        handlerKey,
        new SearchHandler(
          this.queueService,
          this.dataSource,
          this.getFireCrawlService()
        )
      );
    }
    return this.handlers.get(handlerKey);
  }

  getS3Service(): S3Service {
    if (!this.s3Service) {
      this.s3Service = new S3Service(
        process.env.AWS_REGION || 'us-east-1',
        process.env.S3_BUCKET || 'socratic-learning'
      );
    }
    return this.s3Service;
  }

  getFireCrawlService(): FireCrawlService {
    if (!this.fireCrawlService) {
      this.fireCrawlService = new FireCrawlService(
        this.getS3Service(),
        LoggerService.getInstance()
      );
    }
    return this.fireCrawlService;
  }

  getCrawlHandler(): CrawlHandler {
    return new CrawlHandler(
      this.getQueueService(),
      this.getDataSource(),
      this.getFireCrawlService()
    );
  }

  getReviewHandler(): ReviewHandler {
    const handlerKey = 'review';
    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(
        handlerKey,
        new ReviewHandler(
          this.queueService,
          this.dataSource,
          this.getOpenAIService()
        )
      );
    }
    return this.handlers.get(handlerKey);
  }

  getStudyHandler(): StudyHandler {
    const handlerKey = 'study';
    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(
        handlerKey,
        new StudyHandler(this.queueService, this.dataSource)
      );
    }
    return this.handlers.get(handlerKey);
  }

  getCompletedHandler(): CompletedHandler {
    const handlerKey = 'completed';
    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(handlerKey, new CompletedHandler(this.queueService, this.dataSource, this.getOpenAIService()));
    }
    return this.handlers.get(handlerKey);
  }

  // Add more handler getters as we implement them
} 