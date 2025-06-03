import { Review } from '../entities/Review';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { S3Service } from '../services/S3Service';
import { DataSource } from 'typeorm';
import { CompleteStageData, GenericQueueDTO, ReviewStageData } from '../types/dtos';
import { QueueHandler } from './QueueHandler';
import { Topic } from '../entities/Topic';
import { ProcessingStatus } from '../entities/BaseEntity';

export class ReviewHandler extends QueueHandler<ReviewStageData, CompleteStageData, Topic> {
  private openAIService: OpenAIService;
  private s3Service: S3Service;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService,
    s3Service: S3Service
  ) {
    super(
      queueService,
      dataSource,
      Review,
      'REVIEW',
      'COMPLETE'
    );
    this.openAIService = openAIService;
    this.s3Service = s3Service;
  }

  protected async transformQueueMessage(entities: Topic[], prevMessage: GenericQueueDTO<ReviewStageData>): Promise<GenericQueueDTO<CompleteStageData>> {
    // Extract just the fields we need from the queue message
    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: prevMessage.previousStages,
      currentStage: {
        complete: entities.map(entity => entity.id)
      }
    }
  }

  protected async process(input: GenericQueueDTO<ReviewStageData>): Promise<Topic[]> {
    // TODO: Integrate with llm to score relevance of the crawl results
    // TODO: Integrate with text spliiter to chunk text and store in vector db
    const topic = await this.dataSource
      .getRepository(Topic)
      .findOne({
        where: { id: input.core.topicId },
        relations: ['reviews']
      });

    if (!topic) {
      throw new Error(`Topic not found: ${input.core.topicId}`);
    }

    topic.status = ProcessingStatus.COMPLETED;
    await this.dataSource.getRepository(Topic).save(topic);

    return [topic] as Topic[];
  }
} 