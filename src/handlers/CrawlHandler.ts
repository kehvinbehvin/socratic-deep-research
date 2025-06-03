import { BaseHandler } from './BaseHandler';
import { SearchResult } from '../entities/SearchResult';
import { CrawlResult } from '../entities/CrawlResult';
import { QueueService } from '../services/QueueService';
import { FireCrawlService } from '../services/FireCrawlService';
import { S3Service } from '../services/S3Service';
import { DataSource } from 'typeorm';
import { ProcessingStatus } from '../entities/BaseEntity';
import { z } from 'zod';

// Schema for queue messages
export const CrawlQueueSchema = z.object({
  id: z.string().uuid(),
  searchResultId: z.string().uuid(),
  urls: z.array(z.string())
});

export type CrawlQueueInput = z.infer<typeof CrawlQueueSchema>;

export class CrawlHandler extends BaseHandler<CrawlQueueInput, CrawlResult> {
  private fireCrawlService: FireCrawlService;
  private s3Service: S3Service;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    fireCrawlService: FireCrawlService,
    s3Service: S3Service
  ) {
    super(
      queueService,
      dataSource,
      CrawlResult,
      'CRAWL',
      'REVIEW'
    );
    this.fireCrawlService = fireCrawlService;
    this.s3Service = s3Service;
  }

  protected async transformQueueMessage(message: any): Promise<CrawlQueueInput> {
    // Extract just the fields we need from the queue message
    const { id, searchResultId, urls } = message.entity;
    return { id, searchResultId, urls };
  }

  protected async process(input: CrawlQueueInput): Promise<CrawlResult> {
    const searchResult = await this.dataSource
      .getRepository(SearchResult)
      .findOne({
        where: { id: input.id },
        relations: ['searchQuery']
      });

    if (!searchResult) {
      throw new Error(`Search result not found: ${input.id}`);
    }

    // TODO: Implement Firecrawl and S3 integration
    // const crawlResults = [];
    // for (const result of searchResult.results) {
    //   try {
    //     const content = await this.fireCrawlService.crawl(result.url);
    //     const s3Key = `crawls/${searchResult.id}/${Buffer.from(result.url).toString('base64')}.html`;
    //     await this.s3Service.uploadFile(s3Key, content);
    //     crawlResults.push({ url: result.url, s3Key, title: result.title, success: true });
    //   } catch (error) {
    //     crawlResults.push({
    //       url: result.url,
    //       error: error instanceof Error ? error.message : 'Unknown error',
    //       success: false
    //     });
    //   }
    // }

    // Create stub results for testing
    const crawlResults = searchResult.results.map(result => ({
      url: result.url,
      title: result.title,
      s3Key: `stub-crawls/${searchResult.id}/${Buffer.from(result.url).toString('base64')}.html`,
      success: true
    }));

    // Create crawl result entity
    const crawlResult = new CrawlResult();
    crawlResult.searchResult = searchResult;
    crawlResult.results = crawlResults;
    crawlResult.status = ProcessingStatus.PENDING;

    return crawlResult;
  }
} 