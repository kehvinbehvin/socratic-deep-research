import { DataSource } from 'typeorm';
import { Topic } from '../entities/Topic';
import { ProcessingStatus } from '../entities/BaseEntity';
import type { Study, StudyStage } from '../types';
import { LoggerService } from './LoggerService';

export class StudyService {
  private dataSource: DataSource;
  private logger: LoggerService;

  constructor(dataSource: DataSource, logger: LoggerService) {
    this.dataSource = dataSource;
    this.logger = logger;
  }

  async getStudies(): Promise<Study[]> {
    this.logger.info('Getting studies');

    const topics = await this.dataSource
    .getRepository(Topic)
    .createQueryBuilder('topic')
    .leftJoinAndSelect('topic.questions', 'question')
    .orderBy('topic.createdAt', 'DESC')
    .getMany();
      
    return topics.map(topic => ({
        id: topic.id,
        topic: topic.content,
        stage: mapStatusToStage(topic.status),
        createdAt: topic.createdAt.toISOString(),
        updatedAt: topic.updatedAt.toISOString(),
        questions: topic.questions?.map(q => q.content) || [],
        error: topic.error
    }));
  }
}

const mapStatusToStage = (status: ProcessingStatus): StudyStage => {
  switch (status) {
    case ProcessingStatus.PENDING:
      return 'TOPIC';
    case ProcessingStatus.PROCESSING:
      return 'QUESTION';
    case ProcessingStatus.COMPLETED:
      return 'COMPLETED';
    case ProcessingStatus.FAILED:
      return 'FAILED';
    default:
      return 'TOPIC';
  }
}; 