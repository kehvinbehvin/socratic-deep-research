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
      .leftJoinAndSelect('topic.questions', 'questions')
      .leftJoinAndSelect('topic.reflections', 'reflections')
      .leftJoinAndSelect('topic.clarifications', 'clarifications')
      .leftJoinAndSelect('topic.queryPreparations', 'queryPreparations')
      .leftJoinAndSelect('topic.searchResults', 'searchResults')
      .leftJoinAndSelect('topic.crawlResults', 'crawlResults')
      .leftJoinAndSelect('topic.reviews', 'reviews')
      .orderBy('topic.createdAt', 'DESC')
      .getMany();
      
    return topics.map(topic => ({
      id: topic.id,
      topic: topic.content,
      stage: mapStatusToStage(topic.status),
      status: topic.status,
      createdAt: topic.createdAt.toISOString(),
      updatedAt: topic.updatedAt.toISOString(),
      error: topic.error,
      questions: topic.questions?.map(q => ({
        content: q.content,
        createdAt: q.createdAt.toISOString()
      })) || [],
      reflections: topic.reflections?.map(r => ({
        content: r.content,
        createdAt: r.createdAt.toISOString()
      })) || [],
      clarifications: topic.clarifications?.map(c => ({
        content: c.content,
        createdAt: c.createdAt.toISOString()
      })) || [],
      queryPreparations: topic.queryPreparations?.map(qp => ({
        query: qp.query,
        createdAt: qp.createdAt.toISOString()
      })) || [],
      searchResults: topic.searchResults?.map(sr => ({
        url: sr.url,
        createdAt: sr.createdAt.toISOString()
      })) || [],
      crawlResults: topic.crawlResults?.map(cr => ({
        url: cr.url,
        reliability: cr.reliability,
        createdAt: cr.createdAt.toISOString()
      })) || [],
      reviews: topic.reviews?.map(r => ({
        chunkId: r.chunkId,
        relevanceScore: r.relevance,
        createdAt: r.createdAt.toISOString()
      })) || []
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