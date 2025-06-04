import { APIHandler } from './APIHandler';
import { QueueService } from '../services/QueueService';
import { GenericQueueDTO, QueueTopicDTO, TopicStageData } from '../types/dtos';
import { Topic } from '../entities/Topic';
import { DataSource } from 'typeorm';
import { ProcessingStatus } from '../entities/BaseEntity';
import { QueueName } from '../config/queues';

export interface StudyRequest {
  content: string;
}

export class StudyHandler extends APIHandler<StudyRequest, Topic[], QueueTopicDTO> {
  constructor(queueService: QueueService, dataSource: DataSource) {
    super(queueService, dataSource, 'TOPIC'); 
  }

  protected async transformQueueMessage(entities: Topic[]): Promise<QueueTopicDTO> {
    return {
      core: {
        id: entities[0].id,
        createdAt: entities[0].createdAt,
        updatedAt: entities[0].updatedAt,
        status: entities[0].status,
        error: entities[0].error,
        topicId: entities[0].id,
      },
      previousStages: {
        // Topic is the first stage, so no previous stages
      },
      currentStage: {
        content: entities[0].content,
      }
    };
  }

  protected async process(request: StudyRequest): Promise<Topic[]> {
    console.log('Processing request:', request);
    const topic = await this.dataSource.getRepository(Topic).create({
      content: request.content,
    });

    topic.status = ProcessingStatus.PENDING;
    await this.dataSource.getRepository(Topic).save(topic);

    return [topic];
  }
}
