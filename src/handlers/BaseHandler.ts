import { QueueService } from '../services/QueueService';
import { QueueName } from '../config/queues';
import { ProcessingStatus, BaseEntity } from '../entities/BaseEntity';
import { DataSource, Repository, EntityTarget, ObjectLiteral } from 'typeorm';

export abstract class BaseHandler<TInput extends ObjectLiteral, TOutput extends BaseEntity> {
  protected queueService: QueueService;
  protected dataSource: DataSource;
  protected repository: Repository<TOutput>;
  protected inputQueue: QueueName;
  protected outputQueue?: QueueName;

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
  }

  async processMessage(message: { id: string; body: TInput; receiptHandle: string }): Promise<void> {
    const { id, body, receiptHandle } = message;

    try {
      // Process the message
      const result = await this.process(body);

      // Save the result to database
      const savedEntity = await this.repository.save(result);

      // If there's a next queue in the pipeline, send the result to it
      if (this.outputQueue) {
        await this.queueService.sendMessage(this.outputQueue, savedEntity);
      }

      // Delete the processed message from the queue
      await this.queueService.deleteMessage(this.inputQueue, receiptHandle);
    } catch (error) {
      console.error(`Error processing message ${id}:`, error);

      // Update entity status to failed if we have its ID
      if ('id' in body) {
        const entityToUpdate = await this.repository.findOne({ where: { id: body.id } as any });
        if (entityToUpdate) {
          entityToUpdate.status = ProcessingStatus.FAILED;
          entityToUpdate.error = error instanceof Error ? error.message : 'Unknown error';
          await this.repository.save(entityToUpdate);
        }
      }

      // Return message to queue with backoff
      await this.queueService.changeMessageVisibility(
        this.inputQueue,
        receiptHandle,
        300 // 5 minutes backoff
      );
    }
  }

  async start(): Promise<void> {
    while (true) {
      const messages = await this.queueService.receiveMessages<TInput>(this.inputQueue);
      await Promise.all(messages.map(msg => this.processMessage(msg)));
    }
  }

  protected abstract process(input: TInput): Promise<TOutput>;
} 