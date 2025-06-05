import { QueueService } from '../services/QueueService';
import { QUEUE_NAMES, QueueName } from '../config/queues';
import { BaseEntity } from '../entities/BaseEntity';
import { DataSource, Repository, EntityTarget } from 'typeorm';
import { LoggerService } from '../services/LoggerService';
import { GenericQueueDTO } from '../types/dtos';

// T: Queue Generic Input type for the handler
// K: Queue Generic Output type for the handler
// S: Entity type for the handler
export abstract class QueueHandler<T, K, S extends BaseEntity> {
  protected queueService: QueueService;
  protected dataSource: DataSource;
  protected repository: Repository<BaseEntity>;
  protected readonly sourceQueue?: QueueName;
  protected readonly targetQueue?: QueueName;
  protected logger: LoggerService;

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
  }

  // Processes queue message DTO and returns new entities
  protected abstract process(input: GenericQueueDTO<T>): Promise<S[]>;

  // Transform entity to queue message DTO
  protected abstract transformQueueMessage(entities: S[], prevMessage: GenericQueueDTO<T>): Promise<GenericQueueDTO<K>>;

  // Public method for handling queue messages
  public async handleQueueMessage(message: GenericQueueDTO<T>): Promise<S[]> {
    try {
      // Process the input
      const entities: S[] = await this.process(message);

      // Transform entity into queue message DTO
      const queueMessage: GenericQueueDTO<K> = await this.transformQueueMessage(entities, message);

      // If there's a target queue and result exists, send the result
      if (this.targetQueue && queueMessage) {
        await this.queueService.sendMessage(this.targetQueue, queueMessage);
      }

      return entities as S[];
    } catch (error) {
      console.error('Error processing queue message:', error);
      throw error;
    }
  }
} 