import { SearchResult } from '../entities/SearchResult';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { QueueHandler } from './QueueHandler';
import { SearchResultStageData, GenericQueueDTO } from '../types/dtos';
import { Topic } from '../entities';
import { CrawlRequest } from '../entities/CrawlRequest';
import { FireCrawlService } from '../services/FireCrawlService';

export class SearchHandler extends QueueHandler<SearchResultStageData, void, CrawlRequest> {
  private fireCrawlService: FireCrawlService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    fireCrawlService: FireCrawlService
  ) {
    super(
      queueService,
      dataSource,
      SearchResult,
      'SEARCH',
    );
    this.fireCrawlService = fireCrawlService;
  }

  protected async process(input: GenericQueueDTO<SearchResultStageData>): Promise<CrawlRequest[]> {
    let urls = input.currentStage.searchResults;
    const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ where: { id: input.core.topicId }});

    if (urls.length === 0) {
      return [];
    }

    // Guard for testing
    urls = urls.slice(0, 1);

    const crawlRequests = await Promise.all(
      urls.map(async (url) => {
        const crawlRequest = new CrawlRequest();
        const fireCrawlId: string = await this.fireCrawlService.createCrawlRequest(url);
        crawlRequest.fireCrawlId = fireCrawlId;
        crawlRequest.topic = topic;

        return await this.dataSource.getRepository(CrawlRequest).save(crawlRequest);
      })
    );
  
    return crawlRequests;
  }

  protected async transformQueueMessage(
    entities: CrawlRequest[],
    prevMessage: GenericQueueDTO<SearchResultStageData>
  ): Promise<GenericQueueDTO<void>> {
    return null as any;
  }
} 