import { QueueService } from '../services/QueueService';
import { QueueName } from '../config/queues';
import { ProcessingStatus, BaseEntity } from '../entities/BaseEntity';
import { DataSource, Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { LoggerService } from '../services/LoggerService';
import { MonitoringService } from '../services/MonitoringService';
import process from 'process';

export abstract class BaseHandler<TInput extends ObjectLiteral, TOutput extends BaseEntity> {
  protected queueService: QueueService;
  protected dataSource: DataSource;
  protected repository: Repository<TOutput>;
  protected inputQueue: QueueName;
  protected outputQueue?: QueueName;
  protected logger: LoggerService;
  protected monitoring: MonitoringService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    entity: EntityTarget<TOutput>,
    inputQueue: QueueName,
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

  async processMessage(message: { id: string; body: TInput; receiptHandle: string }): Promise<void> {
    const { id, body, receiptHandle } = message;
    const stopTimer = this.monitoring.startTimer(`${this.inputQueue}_processing`);

    try {
      this.logger.info(`Processing message ${id}`, {
        queue: this.inputQueue,
        messageId: id,
        body
      });

      // Process the message
      const result = await this.process(body);

      // Save the result to database
      const savedEntity = await this.repository.save(result);

      // If there's a next queue in the pipeline, send the result to it
      if (this.outputQueue) {
        await this.queueService.sendMessage(this.outputQueue, savedEntity);
        this.logger.debug(`Sent message to next queue`, {
          queue: this.outputQueue,
          entityId: savedEntity.id
        });
      }

      // Delete the processed message from the queue
      await this.queueService.deleteMessage(this.inputQueue, receiptHandle);
      
      this.logger.info(`Successfully processed message ${id}`, {
        queue: this.inputQueue,
        messageId: id,
        entityId: savedEntity.id
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
      this.monitoring.recordError(this.inputQueue, error instanceof Error ? error : new Error(String(error)));

      // Update entity status to failed if we have its ID
      if ('id' in body) {
        const entityToUpdate = await this.repository.findOne({ where: { id: body.id } as any });
        if (entityToUpdate) {
          entityToUpdate.status = ProcessingStatus.FAILED;
          entityToUpdate.error = error instanceof Error ? error.message : 'Unknown error';
          await this.repository.save(entityToUpdate);
          
          this.logger.debug(`Updated entity status to failed`, {
            queue: this.inputQueue,
            entityId: body.id
          });
        }
      }

      // Return message to queue with backoff
      await this.queueService.changeMessageVisibility(
        this.inputQueue,
        receiptHandle,
        300 // 5 minutes backoff
      );
    } finally {
      // Stop the timer and record the duration
      stopTimer();
    }
  }

  async start(): Promise<void> {
    this.logger.info(`Starting handler`, { queue: this.inputQueue });

    while (true) {
      try {
        const messages = await this.queueService.receiveMessages<TInput>(this.inputQueue);
        
        // Record queue metrics
        this.monitoring.recordQueueMetrics(
          this.inputQueue,
          messages.length,
          0 // Initial processing time
        );

        if (messages.length > 0) {
          this.logger.debug(`Received messages`, {
            queue: this.inputQueue,
            count: messages.length
          });
        }

        await Promise.all(messages.map(msg => this.processMessage(msg)));
      } catch (error) {
        this.logger.error(`Error in message processing loop`, {
          queue: this.inputQueue,
          error: error instanceof Error ? error.stack : String(error)
        });
        
        // Record error metric
        this.monitoring.recordError(this.inputQueue, error instanceof Error ? error : new Error(String(error)));

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  protected abstract process(input: TInput): Promise<TOutput>;

  // Public method for handling web/API requests
  public async handleRequest(input: TInput): Promise<TOutput> {
    // Process the request
    const result = await this.process(input);

    // Save to database
    const savedEntity = await this.repository.save(result);

    // For API requests, we should queue the entity for background processing
    await this.queueService.sendMessage(this.inputQueue, {
      id: savedEntity.id,
      ...input
    });

    return savedEntity;
  }
} 