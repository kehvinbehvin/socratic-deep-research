import { QueueService } from '../services/QueueService';
import { QueueName } from '../config/queues';
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

export abstract class BaseHandler<TInput extends ObjectLiteral, TOutput extends BaseEntity> {
  protected queueService: QueueService;
  protected dataSource: DataSource;
  protected repository: Repository<TOutput>;
  protected inputQueue?: QueueName;
  protected outputQueue?: QueueName;
  protected logger: LoggerService;
  protected monitoring: MonitoringService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    entity: EntityTarget<TOutput>,
    inputQueue?: QueueName,
    outputQueue?: QueueName
  ) {
    this.queueService = queueService;
    this.dataSource = dataSource;
    this.repository = dataSource.getRepository(entity);
    this.inputQueue = inputQueue;
    this.outputQueue = outputQueue;
    this.logger = LoggerService.getInstance();
    this.monitoring = MonitoringService.getInstance();
  }

  async processMessage(message: { id: string; body: QueueMessage<any>; receiptHandle: string }): Promise<void> {
    const { id, body, receiptHandle } = message;
    const stopTimer = this.monitoring.startTimer(`${this.inputQueue}_processing`);

    try {
      this.logger.info(`Processing message ${id}`, {
        queue: this.inputQueue,
        messageId: id,
        entityType: body.entityType
      });

      // Transform queue message to handler input
      const input = await this.transformQueueMessage(body);

      // Process the message
      const result = await this.process(input);

      // If there's a next queue in the pipeline, send the result to it
      if (this.outputQueue) {
        const queueMessage: QueueMessage<TOutput> = {
          entityType: this.repository.metadata.name,
          entity: result
        };
        await this.queueService.sendMessage(this.outputQueue, queueMessage);
        this.logger.debug(`Sent message to next queue`, {
          queue: this.outputQueue,
          entityId: result.id,
          entityType: queueMessage.entityType
        });
      }

      // Delete the processed message from the queue
      if (this.inputQueue) {
        await this.queueService.deleteMessage(this.inputQueue, receiptHandle);
      }
      
      this.logger.info(`Successfully processed message ${id}`, {
        queue: this.inputQueue,
        messageId: id,
        entityId: result.id
      });

      // Record success metric
      this.monitoring.recordMetric(`${this.inputQueue}_success`, 1);
    } catch (error) {
      this.logger.error(`Error processing message ${id}`, {
        queue: this.inputQueue,
        messageId: id,
        error: error instanceof Error ? error.stack : String(error)
      });

      // Record error metric
      if (this.inputQueue) {
        this.monitoring.recordError(this.inputQueue, error instanceof Error ? error : new Error(String(error)));
      }

      // Update entity status to failed if we have its ID
      if (body.entity?.id) {
        const entityToUpdate = await this.repository.findOne({ where: { id: body.entity.id } as any });
        if (entityToUpdate) {
          entityToUpdate.status = ProcessingStatus.FAILED;
          entityToUpdate.error = error instanceof Error ? error.message : 'Unknown error';
          await this.repository.save(entityToUpdate);
          
          this.logger.debug(`Updated entity status to failed`, {
            queue: this.inputQueue,
            entityId: body.entity.id
          });
        }
      }

      // Return message to queue with backoff
      if (this.inputQueue) {
        await this.queueService.changeMessageVisibility(
          this.inputQueue,
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
    if (this.inputQueue) {
      const queueMessage: QueueMessage<TOutput> = {
        entityType: this.repository.metadata.name,
        entity: savedEntity
      };
      await this.queueService.sendMessage(this.inputQueue, queueMessage);
    }

    return savedEntity;
  }
} 