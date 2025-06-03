import { SearchResult } from '../entities/SearchResult';
import { QueueService } from '../services/QueueService';
import { SerpApiService } from '../services/SerpApiService';
import { DataSource } from 'typeorm';
import { GenericQueueDTO, SearchResultStageData } from '../types/dtos';
import { CrawlResultStageData } from '../types/dtos';
import { CrawlResult } from '../entities/CrawlResult';
import { QueueHandler } from './QueueHandler';

export class SearchHandler extends QueueHandler<SearchResultStageData, CrawlResultStageData, CrawlResult> {
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

  protected async transformQueueMessage(entities: CrawlResult[], prevMessage: GenericQueueDTO<SearchResultStageData>): Promise<GenericQueueDTO<CrawlResultStageData>> {
    // Extract just the fields we need from the queue message
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
        crawlResults: entities.map(entity => entity.id)
      }
    }
  }

  protected async process(input: GenericQueueDTO<SearchResultStageData>): Promise<CrawlResult[]> {
    // TODO: Integrate with Firecrawl to crawl the web

    return [] as CrawlResult[];
  }
} 