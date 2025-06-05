import { Review } from '../entities/Review';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { QueueHandler } from './QueueHandler';
import { ReviewStageData, GenericQueueDTO, CompleteStageData } from '../types/dtos';
import { Topic } from '../entities';
import { ProcessingStatus } from '../entities/BaseEntity';

export class ReviewHandler extends QueueHandler<ReviewStageData, CompleteStageData, Topic> {

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
  ) {
    super(
      queueService,
      dataSource,
      Review,
      'REVIEW',
      'COMPLETE'
    );
  }

  protected async transformQueueMessage(entities: Topic[], prevMessage: GenericQueueDTO<ReviewStageData>): Promise<GenericQueueDTO<CompleteStageData>> {
    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: {
        ...prevMessage.previousStages,
      },
      currentStage: {
        complete: entities.map(entity => entity.id)
      }
    }
  }

  protected async process(input: GenericQueueDTO<ReviewStageData>): Promise<Topic[]> {
    // Create mock reviews
    const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ where: { id: input.core.topicId }});
    topic.status = ProcessingStatus.COMPLETED;

    await this.dataSource.getRepository(Topic).save(topic);
    return [topic];
  }
} 