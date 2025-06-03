import { Clarification } from '../entities/Clarification';
import { QueryPreparation } from '../entities/QueryPreparation';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { GenericQueueDTO, QueryPreparationStageData } from '../types/dtos';
import { QueueHandler } from './QueueHandler';
import { ClarificationStageData } from '../types/dtos';

export class ClarificationHandler extends QueueHandler<ClarificationStageData, QueryPreparationStageData, QueryPreparation> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      Clarification,
      'CLARIFICATION',
      'QUERY_PREPARATION'
    );
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(entities: QueryPreparation[], prevMessage: GenericQueueDTO<ClarificationStageData>): Promise<GenericQueueDTO<QueryPreparationStageData>> {
    // Extract just the fields we need from the queue message
    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: {
        ...prevMessage.previousStages,
        clarifications: entities.map(entity => entity.id)
      },
      currentStage: {
        queries: entities.map(entity => entity.query),
        keywords: entities.map(entity => entity.keyword)
      }
    }
  }

  protected async process(input: GenericQueueDTO<ClarificationStageData>): Promise<QueryPreparation[]> {
    // TODO: Implement OpenAI integration
    return [] as QueryPreparation[];
  }
} 