import { QueueService } from '../services/QueueService';
import { LoggerService } from '../services/LoggerService';
import { MonitoringService } from '../services/MonitoringService';
import { QUEUE_NAMES, QueueName } from '../config/queues';
import { BaseEntity, DataSource } from 'typeorm';

export abstract class APIHandler<TRequest, TEntity, TQueueDTO> {
  protected queueService: QueueService;
  protected logger: LoggerService;
  protected monitoring: MonitoringService;
  protected readonly targetQueue?: QueueName | undefined;
  protected dataSource: DataSource;

  constructor(queueService: QueueService, dataSource: DataSource, targetQueue?: keyof typeof QUEUE_NAMES) {
    this.dataSource = dataSource;
    this.queueService = queueService;
    this.logger = LoggerService.getInstance();
    this.monitoring = MonitoringService.getInstance();
    this.targetQueue = targetQueue ? QUEUE_NAMES[targetQueue] : undefined;
  }

  protected abstract transformQueueMessage(result: TEntity): Promise<TQueueDTO>;

  // Main API event handler lifecycle
  public async handleAPIEvent(request: TRequest): Promise<{ statusCode: number; body: string }> {
    try {
      const result: TEntity = await this.process(request);

      // Only push to queue if targetQueue is defined and result is present
      if (this.targetQueue && result !== undefined) {
        const queueDTO: TQueueDTO = await this.transformQueueMessage(result);
        await this.queueService.sendMessage(this.targetQueue, queueDTO);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, data: result }),
      };

    } catch (error) {
      this.logger.error('API handler error:' + error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      };
    }
  }

  protected abstract process(request: TRequest): Promise<TEntity>;
}
