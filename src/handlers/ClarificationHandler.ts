import { Clarification } from '../entities/Clarification';
import { QueryPreparation } from '../entities/QueryPreparation';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { QueueHandler } from './QueueHandler';
import { ClarificationStageData, GenericQueueDTO, QueryPreparationStageData } from '../types/dtos';
import { Topic } from '../entities';

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
        keywords: []
      }
    }
  }

  protected async process(input: GenericQueueDTO<ClarificationStageData>): Promise<QueryPreparation[]> {
    // Create mock query preparations based on clarifications
    const mockQueries = [
      "implementation methodologies in different contexts",
      "performance metrics and evaluation criteria",
      "integration challenges with existing systems",
      "regulatory compliance requirements in the field",
      "recent case studies and outcomes in practice"
    ];

    // Create and save query preparation entities
    const queryPreparations = await Promise.all(
      mockQueries.map(async (query) => {
        const queryPrep = new QueryPreparation();
        queryPrep.query = query;
        queryPrep.keyword = query.split(' ').slice(0, 2).join(' '); // First two words as keyword
        const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ where: { id: input.core.topicId }});
        queryPrep.topic = topic;
        return await this.dataSource.getRepository(QueryPreparation).save(queryPrep);
      })
    );

    return queryPreparations;
  }
} 