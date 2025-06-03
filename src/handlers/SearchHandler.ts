import { BaseHandler } from './BaseHandler';
import { SearchResult } from '../entities/SearchResult';
import { QueryPreparation } from '../entities/QueryPreparation';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { OpenAIService } from '../services/OpenAIService';
import axios from 'axios';

interface SearchInput {
  queryPreparationId: string;
}

export class SearchHandler extends BaseHandler<SearchInput, SearchResult> {
  private openAIService: OpenAIService;
  private searchApiKey: string;
  private searchEngineId: string;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService,
    searchApiKey: string,
    searchEngineId: string
  ) {
    super(
      queueService,
      dataSource,
      SearchResult,
      QUEUE_NAMES.SEARCH,
      QUEUE_NAMES.CRAWL
    );
    this.openAIService = openAIService;
    this.searchApiKey = searchApiKey;
    this.searchEngineId = searchEngineId;
  }

  protected async process(input: SearchInput): Promise<SearchResult> {
    // Get the query preparation with its context
    const queryPreparation = await this.dataSource
      .getRepository(QueryPreparation)
      .findOne({
        where: { id: input.queryPreparationId },
        relations: ['clarification', 'clarification.reflection', 'clarification.reflection.question']
      });

    if (!queryPreparation) {
      throw new Error(`Query preparation not found: ${input.queryPreparationId}`);
    }

    // Split search queries into an array
    const queries = queryPreparation.searchQueries.split('\n').filter(q => q.trim());
    const keywords = queryPreparation.keywords.split(',').map(k => k.trim());

    // Perform searches for each query
    const searchResults = await Promise.all(
      queries.map(async (query, queryIndex) => {
        try {
          const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
              key: this.searchApiKey,
              cx: this.searchEngineId,
              q: `${query} ${keywords.slice(0, 3).join(' ')}`,
              num: 5
            }
          });

          return response.data.items.map((item: any, itemIndex: number) => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet,
            rank: queryIndex * 5 + itemIndex + 1
          }));
        } catch (error) {
          this.logger.error('Search API error', {
            error: error instanceof Error ? error.stack : String(error),
            query
          });
          return [];
        }
      })
    );

    // Flatten and format results
    const formattedResults = searchResults.flat().map(result => ({
      url: result.url,
      title: result.title,
      snippet: result.snippet,
      rank: result.rank
    }));

    // Analyze search results using OpenAI
    const prompt = `Analyze the following search results in the context of:
      Question: "${queryPreparation.clarification.reflection.question.content}"
      Keywords: ${keywords.join(', ')}

      Search Results:
      ${formattedResults.map(r => `
        Title: ${r.title}
        URL: ${r.url}
        Snippet: ${r.snippet}
      `).join('\n')}

      Provide an analysis of:
      1. The relevance of each result
      2. How well they cover the topic
      3. Any gaps in the search results
      4. Suggestions for additional searches`;

    const analysis = await this.openAIService.generateText(prompt);

    // Create and save the search result
    const searchResult = new SearchResult();
    searchResult.queryPreparation = queryPreparation;
    searchResult.results = formattedResults;
    searchResult.analysis = analysis;

    return searchResult;
  }
} 