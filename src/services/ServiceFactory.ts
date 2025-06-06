import { DataSource } from 'typeorm';
import { QueueService } from './QueueService';
import { SerpApiService } from './SerpApiService';
import { FireCrawlService } from './FireCrawlService';
import { S3Service } from './S3Service';
import { LoggerService } from './LoggerService';
import { StudyHandler } from '../handlers/StudyHandler';
import { TopicHandler } from '../handlers/TopicHandler';
import { QuestionHandler } from '../handlers/QuestionHandler';
import { ReflectionHandler } from '../handlers/ReflectionHandler';
import { ClarificationHandler } from '../handlers/ClarificationHandler';
import { QueryPreparationHandler } from '../handlers/QueryPreparationHandler';
import { SearchHandler } from '../handlers/SearchHandler';
import { CrawlResultHandler } from '../handlers/CrawlResultHandler';
import { ReviewHandler } from '../handlers/ReviewHandler';
import { CompletedHandler } from '../handlers/CompletedHandler';
import { StudyService } from './StudiesService';
import { LangChainService } from './LangChainService';
import { FireCrawlWebhookHandler } from '../handlers/FireCrawlWebhookHandler';
import { QdrantVectorStoreService } from './QdrantVectorStoreService';
import { UsageTrackingService } from './UsageTrackingService';
import { CentralizedMetricsService } from './CentralisedMetricsService';

export class ServiceFactory {
  private static instance: ServiceFactory | null = null;
  private queueService: QueueService;
  private dataSource: DataSource;
  private serpApiService: SerpApiService;
  private fireCrawlService: FireCrawlService;
  private s3Service: S3Service;
  private loggerService: LoggerService;
  private langChainService: LangChainService;
  private qdrantVectorStoreService: QdrantVectorStoreService;
  private usageTrackingService: UsageTrackingService;
  private centralizedMetrics: CentralizedMetricsService;
  
  constructor() {
    this.loggerService = LoggerService.getInstance();
    this.queueService = new QueueService(
      process.env.QUEUE_ENDPOINT || 'http://localhost:9324',
      process.env.QUEUE_REGION || 'us-east-1',
      process.env.QUEUE_ACCESS_KEY_ID || 'root',
      process.env.QUEUE_SECRET_ACCESS_KEY || 'root'
    );
  }

  static async initialize(dataSource: DataSource): Promise<ServiceFactory> {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
      ServiceFactory.instance.dataSource = dataSource;
      await ServiceFactory.instance.queueService.initialize();
      ServiceFactory.instance.centralizedMetrics = CentralizedMetricsService.getInstance(ServiceFactory.instance.loggerService, process.env.PROMETHEUS_PUSHGATEWAY_URL || 'http://localhost:9091');

      ServiceFactory.instance.serpApiService = new SerpApiService(process.env.SERP_API_KEY || '', ServiceFactory.instance.centralizedMetrics);

      
      ServiceFactory.instance.s3Service = new S3Service(
        process.env.S3_BUCKET_REGION || 'ap-southeast-1',
        process.env.S3_BUCKET || 'socratic-learning'
      );
      ServiceFactory.instance.fireCrawlService = new FireCrawlService(
        ServiceFactory.instance.dataSource,
        ServiceFactory.instance.s3Service,
        ServiceFactory.instance.loggerService,
        ServiceFactory.instance.centralizedMetrics
      );
      ServiceFactory.instance.langChainService = new LangChainService(
        ServiceFactory.instance.loggerService,
        ServiceFactory.instance.centralizedMetrics
      );
      
      ServiceFactory.instance.qdrantVectorStoreService = new QdrantVectorStoreService(
        ServiceFactory.instance.loggerService,
        process.env.PROMETHEUS_PUSHGATEWAY_URL || 'http://localhost:9091',
        process.env.QDRANT_URL || 'http://localhost:6333',
        process.env.OPENAI_API_KEY || '',
      );
      ServiceFactory.instance.usageTrackingService = new UsageTrackingService(
        ServiceFactory.instance.loggerService,
        ServiceFactory.instance.centralizedMetrics,
        process.env.PROMETHEUS_URL || 'http://localhost:9090'
      );
    }
    return ServiceFactory.instance;
  }

  static async close(): Promise<void> {
    if (ServiceFactory.instance) {
      await ServiceFactory.instance.dataSource.destroy();
      await ServiceFactory.instance.centralizedMetrics.pushMetrics('end_relocate_metrics');
      ServiceFactory.instance = null;
    }
  }

  public getStudyHandler(): StudyHandler {
    return new StudyHandler(this.queueService, this.dataSource);
  }

  public getTopicHandler(): TopicHandler {
    return new TopicHandler(
      this.queueService,
      this.dataSource,
      this.langChainService
    );
  }

  public getQuestionHandler(): QuestionHandler {
    return new QuestionHandler(
      this.queueService,
      this.dataSource,
      this.langChainService
    );
  }

  public getReflectionHandler(): ReflectionHandler {
    return new ReflectionHandler(
      this.queueService,
      this.dataSource,
      this.langChainService
    );
  }

  public getClarificationHandler(): ClarificationHandler {
    return new ClarificationHandler(
      this.queueService,
      this.dataSource,
      this.langChainService
    );
  }

  public getQueryPreparationHandler(): QueryPreparationHandler {
    return new QueryPreparationHandler(
      this.queueService,
      this.dataSource,
      this.serpApiService,
      this.s3Service
    );
  }

  public getSearchHandler(): SearchHandler {
    return new SearchHandler(
      this.queueService,
      this.dataSource,
      this.fireCrawlService
    );
  }

  public getCrawlResultHandler(): CrawlResultHandler {
    return new CrawlResultHandler(
      this.queueService,
      this.dataSource,
      this.s3Service,
      this.langChainService
    );
  }

  public getReviewHandler(): ReviewHandler {
    return new ReviewHandler(
      this.queueService,
      this.dataSource,
    );
  }

  public getCompletedHandler(): CompletedHandler {
    return new CompletedHandler(
      this.queueService,
      this.dataSource
    );
  }

  public getQueueService(): QueueService {
    return this.queueService;
  }

  public getDataSource(): DataSource {
    return this.dataSource;
  }

  public getSerpApiService(): SerpApiService {
    return this.serpApiService;
  }

  public getFireCrawlService(): FireCrawlService {
    return this.fireCrawlService;
  }

  public getS3Service(): S3Service {
    return this.s3Service;
  }

  public getLoggerService(): LoggerService {
    return this.loggerService;
  }

  public getStudyService(): StudyService {
    return new StudyService(this.dataSource, this.loggerService);
  }

  public getLangChainService(): LangChainService {
    return this.langChainService;
  }

  public getFireCrawlWebhookHandler(): FireCrawlWebhookHandler {
    return new FireCrawlWebhookHandler(
      this.queueService,
      this.dataSource,
      this.fireCrawlService,
      this.langChainService,
      this.s3Service
    );
  }

  public getQdrantVectorStoreService(): QdrantVectorStoreService {
    return this.qdrantVectorStoreService;
  }

  public getUsageTrackingService(): UsageTrackingService {
    return this.usageTrackingService;
  }

  public getCentralizedMetrics(): CentralizedMetricsService {
    return this.centralizedMetrics;
  }

} 