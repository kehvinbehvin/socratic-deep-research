import { DataSource } from 'typeorm';
import { QueueService } from './QueueService';
import { TopicHandler } from '../handlers/TopicHandler';

export class ServiceFactory {
  private static instance: ServiceFactory;
  private dataSource: DataSource;
  private queueService: QueueService;
  private handlers: Map<string, any>;

  private constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.queueService = new QueueService();
    this.handlers = new Map();
  }

  static async initialize(dataSource: DataSource): Promise<ServiceFactory> {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory(dataSource);
      await ServiceFactory.instance.queueService.initialize();
    }
    return ServiceFactory.instance;
  }

  getQueueService(): QueueService {
    return this.queueService;
  }

  getTopicHandler(): TopicHandler {
    const handlerKey = 'topic';
    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(
        handlerKey,
        new TopicHandler(this.queueService, this.dataSource)
      );
    }
    return this.handlers.get(handlerKey);
  }

  // Add more handler getters as we implement them
} 