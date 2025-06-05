import { QueryPreparation } from '../entities/QueryPreparation';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { GenericQueueDTO, QueryPreparationStageData, SearchResultStageData } from '../types/dtos';
import { QueueHandler } from './QueueHandler';
import { SearchResult } from '../entities/SearchResult';
import { Topic } from '../entities';
import { SerpApiService } from '../services/SerpApiService';
import { SerpApiResult } from '../services/SerpApiService';
import { S3Service } from '../services/S3Service';

export class QueryPreparationHandler extends QueueHandler<QueryPreparationStageData, SearchResultStageData, SearchResult> {
  private serpApiService: SerpApiService;
  private s3Service: S3Service;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    serpApiService: SerpApiService,
    s3Service: S3Service
  ) {
    super(
      queueService,
      dataSource,
      QueryPreparation,
      'QUERY_PREPARATION',
      'SEARCH'
    );
    this.serpApiService = serpApiService;
    this.s3Service = s3Service;
  }

  private generateKey(query: string, timestamp: string, location: string): string {
    // Create a unique key for S3 storage
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const sanitizedLocation = location.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `serp/${sanitizedQuery}_${sanitizedLocation}_${timestamp}`;
  }

  private async storeSerpResults(key: string, results: SerpApiResult[]): Promise<void> {
    try {
      console.log('Storing SERP results in S3 for key:', key);
      await this.s3Service.uploadJson(key, results);
    } catch (e) {
      console.error('[storeSerpResults]', e);
      // Don't throw - we want to continue even if storage fails
    }
  }
  protected async transformQueueMessage(entities: SearchResult[], prevMessage: GenericQueueDTO<QueryPreparationStageData>): Promise<GenericQueueDTO<SearchResultStageData>> {
    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: {
        ...prevMessage.previousStages,
        searchResults: entities.map(entity => entity.id)
      },
      currentStage: {
        searchResults: entities.map(entity => entity.url)
      }
    }
  }

  protected async process(input: GenericQueueDTO<QueryPreparationStageData>): Promise<SearchResult[]> {
    try {
      // Get the topic to generate appropriate search query
      const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ 
        where: { id: input.core.topicId }
      });

      if (input.currentStage.queries.length === 0) {
        return []
      }

      // Use the first query from the input stage data for testing
      const query = input.currentStage.queries[0]
      const location = 'United States'; // Default location
      
      // Perform SERP API search
      const searchResponse: SerpApiResult[] = await this.serpApiService.search(query, 1);
      
      // Store results in S3 for future reference
      const key = this.generateKey(query, new Date().toISOString(), location);
      await this.storeSerpResults(key,  searchResponse);

      // Create and save search result entities
      const searchResults = await Promise.all(
        searchResponse.map(async (result) => {
          const searchResult = new SearchResult();
          searchResult.url = result.url;
          searchResult.topic = topic;
          
          return await this.dataSource.getRepository(SearchResult).save(searchResult);
        })
      );

      return searchResults;
    } catch (error) {
      console.error('Error in QueryPreparationHandler process:', error);
      throw error;
    }
  }
} 