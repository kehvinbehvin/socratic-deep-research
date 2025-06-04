import { SearchResult } from '../entities/SearchResult';
import { CrawlResult } from '../entities/CrawlResult';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { QueueHandler } from './QueueHandler';
import { SearchResultStageData, GenericQueueDTO, CrawlResultStageData } from '../types/dtos';
import { Topic } from '../entities';

export class SearchHandler extends QueueHandler<SearchResultStageData, CrawlResultStageData, CrawlResult> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      SearchResult,
      'SEARCH',
      'CRAWL'
    );
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(entities: CrawlResult[], prevMessage: GenericQueueDTO<SearchResultStageData>): Promise<GenericQueueDTO<CrawlResultStageData>> {
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
        crawlResults: entities.map(entity => entity.url)
      }
    }
  }

  protected async process(input: GenericQueueDTO<SearchResultStageData>): Promise<CrawlResult[]> {
    // Create mock crawl results
    const mockCrawlResults = [
      {
        url: "https://example.com/comprehensive-guide",
        reliability: 0.92
      },
      {
        url: "https://research.org/latest-findings",
        reliability: 0.88
      },
      {
        url: "https://academic.edu/methodology-review",
        reliability: 0.95
      },
      {
        url: "https://industry.com/case-studies",
        reliability: 0.85
      },
      {
        url: "https://institute.org/best-practices",
        reliability: 0.90
      }
    ];

    // Create and save crawl result entities
    const crawlResults = await Promise.all(
      mockCrawlResults.map(async ({ url, reliability }) => {
        const crawlResult = new CrawlResult();
        crawlResult.url = url;
        crawlResult.reliability = reliability;
        const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ where: { id: input.core.topicId }});
        crawlResult.topic = topic;
        return await this.dataSource.getRepository(CrawlResult).save(crawlResult);
      })
    );

    return crawlResults;
  }
} 