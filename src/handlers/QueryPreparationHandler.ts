import { BaseHandler } from './BaseHandler';
import { SearchResult } from '../entities/SearchResult';
import { QueryPreparation } from '../entities/QueryPreparation';
import { QueueService } from '../services/QueueService';
import { SerpApiService } from '../services/SerpApiService';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';

interface QueryPreparationInput {
  queryPreparationId: string;
}

export class QueryPreparationHandler extends BaseHandler<QueryPreparationInput, SearchResult> {
  private serpApiService: SerpApiService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    serpApiService: SerpApiService
  ) {
    super(
      queueService,
      dataSource,
      QueryPreparation,
      QUEUE_NAMES.QUERY_PREPARATION,
      QUEUE_NAMES.SEARCH
    );
    this.serpApiService = serpApiService;
  }

  protected async process(input: QueryPreparationInput): Promise<SearchResult> {
    // Get the query preparation with its context
    const queryPreparation = await this.dataSource
      .getRepository(QueryPreparation)
      .findOne({
        where: { id: input.queryPreparationId },
      });

    if (!queryPreparation) {
      throw new Error(`Query preparation not found: ${input.queryPreparationId}`);
    }

    // TODO: Implement search integration with serpapi service properly
    // Get first search query and keywords
    // const query = queryPreparation.searchQueries.split('\n')[0].trim();
    // const keywords = queryPreparation.keywords.split(',').map(k => k.trim());

    // // Perform search with enhanced query
    // const enhancedQuery = `${query} ${keywords.slice(0, 3).join(' ')}`;
    // const results = await this.serpApiService.search(enhancedQuery, 5);

    // // Map to our result format
    // const searchResults = results.map(result => ({
    //   url: result.url,
    //   title: result.title,
    //   snippet: result.snippet,
    //   rank: result.position
    // }));

    // Create search result entity
    const searchResult = new SearchResult();
    searchResult.queryPreparation = queryPreparation;
    // searchResult.results = searchResults;
    searchResult.results = [];
    searchResult.status = ProcessingStatus.PENDING;

    return searchResult;
  }
} 