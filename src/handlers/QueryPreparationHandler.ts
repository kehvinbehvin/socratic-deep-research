import { QueryPreparation } from '../entities/QueryPreparation';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { GenericQueueDTO, QueryPreparationStageData, SearchResultStageData } from '../types/dtos';
import { QueueHandler } from './QueueHandler';
import { SearchResult } from '../entities/SearchResult';
import { Topic } from '../entities';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

interface SerpApiResponse {
  search_metadata: {
    id: string;
    status: string;
  };
  organic_results: Array<{
    position: number;
    title: string;
    link: string;
    snippet: string;
  }>;
}

export class QueryPreparationHandler extends QueueHandler<QueryPreparationStageData, SearchResultStageData, SearchResult> {
  private openAIService: OpenAIService;
  private s3Client: S3Client;

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
    this.s3Client = new S3Client({});
  }

  private async getSerpApiKey(): Promise<string> {
    // TODO: Implement your secret retrieval logic here
    return process.env.SERPAI_API_KEY || '';
  }

  private generateKey(query: string, timestamp: string, location: string): string {
    // Create a unique key for S3 storage
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const sanitizedLocation = location.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `serp/${sanitizedQuery}_${sanitizedLocation}_${timestamp}`;
  }

  private async storeSerpResults(key: string, results: SerpApiResponse): Promise<void> {
    try {
      console.log('Storing SERP results in S3 for key:', key);
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `${key}.json`,
        Body: JSON.stringify(results),
        ContentType: 'application/json',
      };

      await this.s3Client.send(new PutObjectCommand(params));
    } catch (e) {
      console.error('[storeSerpResults]', e);
      // Don't throw - we want to continue even if storage fails
    }
  }

  private async searchWithSerpApi(query: string, location: string): Promise<SerpApiResponse> {
    console.log('Searching with SERP API for query:', query);
    const serpKey = await this.getSerpApiKey();
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google',
        api_key: serpKey,
        q: query,
        location: location,
      }
    });

    return response.data;
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
      const searchResponse = await this.searchWithSerpApi(query, location);
      
      // Store results in S3 for future reference
      const key = this.generateKey(query, new Date().toISOString(), location);
      await this.storeSerpResults(key, searchResponse);

      // Create and save search result entities
      const searchResults = await Promise.all(
        searchResponse.organic_results.map(async (result) => {
          const searchResult = new SearchResult();
          searchResult.url = result.link;
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