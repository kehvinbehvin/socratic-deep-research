import { S3Service } from '../services/S3Service';
import { LoggerService } from '../services/LoggerService';
import { Page } from '../entities/Page';
import { DataSource } from 'typeorm';

export class FireCrawlService {
  private dataSource: DataSource;
  private s3Service: S3Service;
  private logger: LoggerService;

  constructor(dataSource: DataSource, s3Service: S3Service, logger: LoggerService) {
    this.dataSource = dataSource;
    this.s3Service = s3Service;
    this.logger = logger;
  }

  async createCrawlRequest(url: string): Promise<string> {
    try {
      const body = {
        url: url,
        limit: 1,
        delay: 1,
        maxDepth: 2,
        webhook: {
          url: process.env.FC_WEBHOOK,
          headers: {
            xRelocateKey: process.env.X_RELOCATE_KEY
          },
          events: ["completed", "failed"]
        },
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
          removeBase64Images: true,
          blockAds: true,
          proxy: "basic"
        }
      };

      const response = await fetch('https://api.firecrawl.dev/v1/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FC_API_KEY}`
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log("FireCrawl response", data)

      if (!data.success) {
        throw new Error(data.error);
      }

      this.logger.info('FireCrawl request created', { url, crawlId: data.id });

      return data.id;

    } catch (error) {
      this.logger.error('Failed to create FireCrawl request', {
        url,
        error: error instanceof Error ? error.stack : String(error)
      });
      throw error;
    }
  }

  async handleWebhookResponse(crawlId: string): Promise<string> {
    try {
      const response = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FC_API_KEY}`
        },
      });

      const data = await response.json();

      if(data.data.length === 0) {
        throw new Error(`No crawled content found for crawlId: ${crawlId}`);
      }
      
      // Process and store each crawled item
      for (const item of data.data) {
        const scrapeId = item.metadata.scrapeId;
        const key = `crawls/${crawlId}/${scrapeId}.json`;

        const pageUrl = this.getCrawlUrl(crawlId, scrapeId);

        const page = await this.dataSource.getRepository(Page).save({
          url: pageUrl,
          crawlResult: {
            id: crawlId
          }
        });

        await this.s3Service.uploadJson(key, {
          url: item.metadata.url,
          content: item.markdown || '',
          timestamp: new Date().toISOString()
        });
      }

      this.logger.info('Successfully processed webhook response', { crawlId });
      return crawlId;

    } catch (error) {
      this.logger.error('Failed to handle webhook response', {
        crawlId,
        error: error instanceof Error ? error.stack : String(error)
      });
      throw error;
    }
  }

  async getCrawledContent(crawlId: string, scrapeId: string): Promise<string> {
    const url = this.getCrawlUrl(crawlId, scrapeId);
    const content: string = await this.s3Service.getJson(url);
    return content;
  }

  getCrawlUrl(crawlId: string, scrapeId: string): string {
    return `https://socratic-learning.s3.ap-southeast-1.amazonaws.com/crawls/${crawlId}/${scrapeId}.json`;
  }
} 