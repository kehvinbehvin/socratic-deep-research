import { DataSource } from 'typeorm';
import { QueueService } from './QueueService';
import { OpenAIService } from './OpenAIService';
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
import { CrawlHandler } from '../handlers/CrawlHandler';
import { ReviewHandler } from '../handlers/ReviewHandler';
import { CompletedHandler } from '../handlers/CompletedHandler';
import { StudyService } from './StudiesService';
import { MetricsService } from './MetricsService';
import { SystemMonitor } from '../utils/monitor';
import { MonitoringService } from './MonitoringService';
import { LangChainService } from './LangChainService';

export class ServiceFactory {
  private static instance: ServiceFactory | null = null;
  private queueService: QueueService;
  private dataSource: DataSource;
  private openAIService: OpenAIService;
  private serpApiService: SerpApiService;
  private fireCrawlService: FireCrawlService;
  private s3Service: S3Service;
  private loggerService: LoggerService;
  private systemMonitor: SystemMonitor;
  private monitoring: MonitoringService;
  private langChainService: LangChainService;
  
  constructor() {
    this.loggerService = LoggerService.getInstance();
    this.monitoring = MonitoringService.getInstance();
    this.systemMonitor = new SystemMonitor();
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
      
      ServiceFactory.instance.openAIService = new OpenAIService(process.env.OPENAI_API_KEY || '');
      ServiceFactory.instance.serpApiService = new SerpApiService(process.env.SERP_API_KEY || '');
      ServiceFactory.instance.s3Service = new S3Service(
        process.env.AWS_REGION || 'us-east-1',
        process.env.S3_BUCKET || 'socratic-learning'
      );
      ServiceFactory.instance.fireCrawlService = new FireCrawlService(
        ServiceFactory.instance.s3Service,
        ServiceFactory.instance.loggerService
      );
      ServiceFactory.instance.langChainService = new LangChainService();
    }
    return ServiceFactory.instance;
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
      this.openAIService
    );
  }

  public getSearchHandler(): SearchHandler {
    return new SearchHandler(
      this.queueService,
      this.dataSource,
      this.openAIService
    );
  }

  public getCrawlHandler(): CrawlHandler {
    return new CrawlHandler(
      this.queueService,
      this.dataSource,
      this.fireCrawlService,
      this.s3Service
    );
  }

  public getReviewHandler(): ReviewHandler {
    return new ReviewHandler(
      this.queueService,
      this.dataSource,
      this.openAIService
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

  public getOpenAIService(): OpenAIService {
    return this.openAIService;
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

  public getMetricsService(): MetricsService {
    return new MetricsService(
      this.monitoring,
      this.systemMonitor,
      this.loggerService
    );
  }

  public getLangChainService(): LangChainService {
    return this.langChainService;
  }
} 