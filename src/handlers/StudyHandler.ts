import { APIHandler } from './APIHandler';
import { QueueService } from '../services/QueueService';
import { TopicStageData } from '../types/dtos';
import { Topic } from '../entities/Topic';
import { DataSource } from 'typeorm';
import { ProcessingStatus } from '../entities/BaseEntity';
import { APIGatewayProxyEvent } from 'aws-lambda';

interface StudyRequest {
  content: string;
}

export class StudyHandler extends APIHandler<StudyRequest, TopicStageData> {
  constructor(queueService: QueueService, dataSource: DataSource) {
    super(queueService, dataSource, 'TOPIC'); 
  }

  protected parseAPIEvent(event: APIGatewayProxyEvent): StudyRequest {
    return JSON.parse(event.body || '{}');
  }

  protected async process(request: StudyRequest): Promise<TopicStageData> {
    const topic = await this.dataSource.getRepository(Topic).create({
      content: request.content,
    });

    topic.status = ProcessingStatus.PENDING;
    await this.dataSource.getRepository(Topic).save(topic);

    return {
      content: topic.content,
    };
  }
}
