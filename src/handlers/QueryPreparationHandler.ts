import { QueryPreparation } from '../entities/QueryPreparation';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { GenericQueueDTO, QueryPreparationStageData, SearchResultStageData } from '../types/dtos';
import { QueueHandler } from './QueueHandler';
import { SearchResult } from '../entities/SearchResult';
import { Topic } from '../entities';

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
        searchResults: entities.map(entity => entity.url)
      }
    }
  }

  protected async process(input: GenericQueueDTO<QueryPreparationStageData>): Promise<SearchResult[]> {
    // Create mock search results based on the queries
    const mockResults = [
      {
        url: "https://example.com/implementation-guide",
        title: "Comprehensive Implementation Guide",
        snippet: "Detailed guide on implementation methodologies across different contexts..."
      },
      {
        url: "https://research.org/metrics",
        title: "Performance Metrics Framework",
        snippet: "Standard evaluation criteria and performance metrics for system assessment..."
      },
      {
        url: "https://tech.edu/integration",
        title: "System Integration Best Practices",
        snippet: "Guidelines for seamless integration with existing enterprise systems..."
      },
      {
        url: "https://compliance.org/standards",
        title: "Regulatory Compliance Standards",
        snippet: "Latest regulatory requirements and compliance frameworks..."
      },
      {
        url: "https://industry.com/case-studies",
        title: "Industry Case Studies",
        snippet: "Real-world implementation examples and success stories..."
      }
    ];

    // Create and save search result entities
    const searchResults = await Promise.all(
      mockResults.map(async ({ url, title, snippet }) => {
        const searchResult = new SearchResult();
        searchResult.url = url;
        const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ where: { id: input.core.topicId }});
        searchResult.topic = topic;
        return await this.dataSource.getRepository(SearchResult).save(searchResult);
      })
    );

    return searchResults;
  }
} 