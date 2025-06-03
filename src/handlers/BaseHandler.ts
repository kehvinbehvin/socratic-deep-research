import { QueueService } from '../services/QueueService';
import { QUEUE_NAMES, QueueName } from '../config/queues';
import { ProcessingStatus, BaseEntity } from '../entities/BaseEntity';
import { DataSource, Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { LoggerService } from '../services/LoggerService';
import { MonitoringService } from '../services/MonitoringService';
import process from 'process';

// Base type for all queue messages
interface QueueMessage<T extends BaseEntity> {
  entityType: string;
  entity: T;
}

export abstract class BaseHandler<TInput, TOutput extends BaseEntity> {
  protected queueService: QueueService;
  protected dataSource: DataSource;
  protected repository: Repository<BaseEntity>;
  protected readonly sourceQueue?: QueueName;
  protected readonly targetQueue?: QueueName;
  protected logger: LoggerService;
  protected monitoring: MonitoringService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    entityType: EntityTarget<BaseEntity>,
    sourceQueue?: keyof typeof QUEUE_NAMES,
    targetQueue?: keyof typeof QUEUE_NAMES
  ) {
    this.queueService = queueService;
    this.dataSource = dataSource;
    this.repository = dataSource.getRepository(entityType);
    this.sourceQueue = sourceQueue ? QUEUE_NAMES[sourceQueue] : undefined;
    this.targetQueue = targetQueue ? QUEUE_NAMES[targetQueue] : undefined;
    this.logger = LoggerService.getInstance();
    this.monitoring = MonitoringService.getInstance();
  }

  async processMessage(message: { id: string; body: QueueMessage<any>; receiptHandle: string }): Promise<void> {
    const { id, body, receiptHandle } = message;
    const stopTimer = this.monitoring.startTimer(`${this.sourceQueue}_processing`);

    try {
      this.logger.info(`Processing message ${id}`, {
        queue: this.sourceQueue,
        messageId: id,
        entityType: body.entityType
      });

      // Transform queue message to handler input
      const input = await this.transformQueueMessage(body);

      // Process the message
      const result = await this.process(input);

      // If there's a next queue in the pipeline, send the result to it
      if (this.targetQueue) {
        const queueMessage: QueueMessage<TOutput> = {
          entityType: this.repository.metadata.name,
          entity: result
        };
        await this.queueService.sendMessage(this.targetQueue, queueMessage);
        this.logger.debug(`Sent message to next queue`, {
          queue: this.targetQueue,
          entityId: result.id,
          entityType: queueMessage.entityType
        });
      }

      // Delete the processed message from the queue
      if (this.sourceQueue) {
        await this.queueService.deleteMessage(this.sourceQueue, receiptHandle);
      }
      
      this.logger.info(`Successfully processed message ${id}`, {
        queue: this.sourceQueue,
        messageId: id,
        entityId: result.id
      });

      // Record success metric
      this.monitoring.recordMetric(`${this.sourceQueue}_success`, 1);
    } catch (error) {
      this.logger.error(`Error processing message ${id}`, {
        queue: this.sourceQueue,
        messageId: id,
        error: error instanceof Error ? error.stack : String(error)
      });

      // Record error metric
      if (this.sourceQueue) {
        this.monitoring.recordError(this.sourceQueue, error instanceof Error ? error : new Error(String(error)));
      }

      // Update entity status to failed if we have its ID
      if (body.entity?.id) {
        const entityToUpdate = await this.repository.findOne({ where: { id: body.entity.id } as any });
        if (entityToUpdate) {
          entityToUpdate.status = ProcessingStatus.FAILED;
          entityToUpdate.error = error instanceof Error ? error.message : 'Unknown error';
          await this.repository.save(entityToUpdate);
          
          this.logger.debug(`Updated entity status to failed`, {
            queue: this.sourceQueue,
            entityId: body.entity.id
          });
        }
      }

      // Return message to queue with backoff
      if (this.sourceQueue) {
        await this.queueService.changeMessageVisibility(
          this.sourceQueue,
          receiptHandle,
          300 // 5 minutes backoff
        );
      }
    } finally {
      // Stop the timer and record the duration
      stopTimer();
    }
  }

  // Transform queue message to handler input
  protected async transformQueueMessage(message: QueueMessage<any>): Promise<TInput> {
    // Default implementation extracts needed fields from the entity
    // Handlers can override this to provide custom transformation
    return message.entity;
  }

  protected abstract process(input: TInput): Promise<TOutput>;

  // Public method for handling web/API requests
  public async handleRequest(input: TInput): Promise<TOutput> {
    // Process the request
    const result = await this.process(input);

    // Save to database
    const savedEntity = await this.repository.save(result);

    // For API requests, we should queue the entity for background processing
    if (this.sourceQueue) {
      const queueMessage: QueueMessage<TOutput> = {
        entityType: this.repository.metadata.name,
        entity: savedEntity
      };
      await this.queueService.sendMessage(this.sourceQueue, queueMessage);
    }

    return savedEntity;
  }

  public getTargetQueue(): QueueName | undefined {
    return this.targetQueue;
  }

  public async handleQueueMessage(message: any): Promise<TOutput> {
    try {
      // Transform the message
      const input = await this.transformQueueMessage(message);

      // Process the input
      const result = await this.process(input);

      // If there's a target queue and result exists, send the result
      if (this.targetQueue && result) {
        await this.queueService.sendMessage(this.targetQueue, result);
      }

      return result;
    } catch (error) {
      console.error('Error processing queue message:', error);
      throw error;
    }
  }
} 