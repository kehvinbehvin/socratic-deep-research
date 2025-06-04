import { QueueService } from '../services/QueueService';
import { LoggerService } from '../services/LoggerService';
import { MonitoringService } from '../services/MonitoringService';
import { QueueName } from '../config/queues';
import { DataSource } from 'typeorm';

export abstract class APIHandler<TRequest, TResponse, TQueueMessage = undefined> {
  protected queueService: QueueService;
  protected logger: LoggerService;
  protected monitoring: MonitoringService;
  protected targetQueue?: string;
  protected dataSource: DataSource;

  constructor(queueService: QueueService, dataSource: DataSource, targetQueue?: string) {
    this.dataSource = dataSource;
    this.queueService = queueService;
    this.logger = LoggerService.getInstance();
    this.monitoring = MonitoringService.getInstance();
    this.targetQueue = targetQueue;
  }

  // Main API event handler lifecycle
  public async handleAPIEvent(event: any): Promise<{ statusCode: number; body: string }> {
    try {
      const request = this.parseAPIEvent(event);
      const result = await this.process(request);

      // Only push to queue if targetQueue is defined and result is present
      if (this.targetQueue && result !== undefined) {
        await this.queueService.sendMessage(this.targetQueue as QueueName, result);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, data: result }),
      };
    } catch (error) {
      this.logger.error('API handler error:', { error });
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      };
    }
  }

  protected abstract parseAPIEvent(event: any): TRequest;
  protected abstract process(request: TRequest): Promise<TResponse | TQueueMessage | undefined>;
}
