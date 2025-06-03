import { BaseHandler } from './BaseHandler';
import { SearchQuery } from '../entities/SearchQuery';
import { SearchResult } from '../entities/SearchResult';
import { QueueService } from '../services/QueueService';
import { SerpApiService } from '../services/SerpApiService';
import { DataSource } from 'typeorm';
import { ProcessingStatus } from '../entities/BaseEntity';
import { z } from 'zod';

// Schema for queue messages
export const SearchQueueSchema = z.object({
  id: z.string().uuid(),
  queries: z.array(z.string()),
  keywords: z.array(z.string()),
  queryPreparationId: z.string().uuid()
});

export type SearchQueueInput = z.infer<typeof SearchQueueSchema>;

export class SearchHandler extends BaseHandler<SearchQueueInput, SearchResult> {
  private serpApiService: SerpApiService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    serpApiService: SerpApiService
  ) {
    super(
      queueService,
      dataSource,
      SearchResult,
      'SEARCH',
      'CRAWL'
    );
    this.serpApiService = serpApiService;
  }

  protected async transformQueueMessage(message: any): Promise<SearchQueueInput> {
    // Extract just the fields we need from the queue message
    const { id, queries, keywords, queryPreparationId } = message.entity;
    return { id, queries, keywords, queryPreparationId };
  }

  protected async process(input: SearchQueueInput): Promise<SearchResult> {
    const searchQuery = await this.dataSource
      .getRepository(SearchQuery)
      .findOne({
        where: { id: input.id },
        relations: ['queryPreparation']
      });

    if (!searchQuery) {
      throw new Error(`Search query not found: ${input.id}`);
    }

    // TODO: Implement SERP API integration
    // const allResults = [];
    // for (const query of searchQuery.queries) {
    //   const enhancedQuery = `${query} ${searchQuery.keywords.slice(0, 3).join(' ')}`;
    //   const results = await this.serpApiService.search(enhancedQuery, 5);
    //   allResults.push(...results);
    // }

    // Create stub results for testing
    const allResults = searchQuery.queries.map((query, index) => ({
      url: `https://example.com/result-${index + 1}`,
      title: `Stub Result ${index + 1} for: ${query}`,
      snippet: `This is a stub search result for the query: ${query}`,
      rank: index + 1
    }));

    // Create search result entity
    const searchResult = new SearchResult();
    searchResult.searchQuery = searchQuery;
    searchResult.results = allResults;
    searchResult.status = ProcessingStatus.PENDING;

    return searchResult;
  }
} 