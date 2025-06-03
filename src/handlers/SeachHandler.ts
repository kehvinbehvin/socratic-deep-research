import { BaseHandler } from './BaseHandler';
import { CrawlResult } from '../entities/CrawlResult';
import { SearchResult } from '../entities/SearchResult';
import { QueueService } from '../services/QueueService';
import { FireCrawlService } from '../services/FireCrawlService';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';
// import type { S3Link } from '../entities/CrawlResult';

interface SearchInput {
  searchResultId: string;
}

export class SearchHandler extends BaseHandler<SearchInput, CrawlResult> {
  private fireCrawlService: FireCrawlService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    fireCrawlService: FireCrawlService
  ) {
    super(
      queueService,
      dataSource,
      CrawlResult,
      QUEUE_NAMES.SEARCH,
      QUEUE_NAMES.CRAWL
    );
    this.fireCrawlService = fireCrawlService;
  }

  protected async process(input: SearchInput): Promise<CrawlResult> {
    // Get the search result
    const searchResult = await this.dataSource
      .getRepository(SearchResult)
      .findOne({
        where: { id: input.searchResultId }
      });

    if (!searchResult) {
      throw new Error(`Search result not found: ${input.searchResultId}`);
    }

    // Crawl each URL and store results
    const s3Links = [];
    for (const result of searchResult.results) {
      try {
        const crawlResult = await this.fireCrawlService.crawl(result.url);
        s3Links.push({
          url: result.url,
          s3Key: `crawls/${searchResult.id}/${Buffer.from(result.url).toString('base64')}.json`,
          status: 'completed'
        });
      } catch (error) {
        this.logger.error('Failed to crawl URL', {
          url: result.url,
          error: error instanceof Error ? error.stack : String(error)
        });
        s3Links.push({
          url: result.url,
          s3Key: '',
          status: 'failed'
        });
      }
    }

    // Create crawl result entity
    const crawlResult = new CrawlResult();
    crawlResult.searchResult = searchResult;
    // crawlResult.s3Links = s3Links as S3Link[];
    crawlResult.s3Links = [];
    crawlResult.status = ProcessingStatus.PENDING;

    return crawlResult;
  }
} 