import { QueryPreparation } from '../entities/QueryPreparation';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { GenericQueueDTO, QueryPreparationStageData, SearchResultStageData } from '../types/dtos';
import { QueueHandler } from './QueueHandler';
import { SearchResult } from '../entities/SearchResult';

export class QueryPreparationHandler extends QueueHandler<QueryPreparationStageData, SearchResultStageData, SearchResult> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      QueryPreparation,
      'QUERY_PREPARATION',
      'SEARCH'
    );
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(entities: SearchResult[], prevMessage: GenericQueueDTO<QueryPreparationStageData>): Promise<GenericQueueDTO<SearchResultStageData>> {
    // Extract just the fields we need from the queue message
    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: {
        ...prevMessage.previousStages,
        queryPreparations: entities.map(entity => entity.id)
      },
      currentStage: {
        searchResults: entities.map(entity => entity.id)
      }
    }
  }

  protected async process(input: GenericQueueDTO<QueryPreparationStageData>): Promise<SearchResult[]> {
    // TODO: Implement OpenAI integration
    // Itegrate with serpapi to use queries and keywords to search the web
    // Integrate with llm to score reliability of the search results
    // Integrate with llm to score trustworthiness of the search results

    return [] as SearchResult[];
  }
} 