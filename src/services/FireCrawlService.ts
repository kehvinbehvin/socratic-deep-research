import { S3Service } from '../services/S3Service';
import { LoggerService } from '../services/LoggerService';

export class FireCrawlService {
  private s3Service: S3Service;
  private logger: LoggerService;

  constructor(s3Service: S3Service, logger: LoggerService) {
    this.s3Service = s3Service;
    this.logger = logger;
  }

  async createCrawlRequest(url: string): Promise<string> {
    try {
      const body = {
        url: url,
        limit: 1,
        delay: 1,
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
      
      // Process and store each crawled item
      for (const item of data.data) {
        const key = `crawls/${crawlId}/${item.metadata.scrapeId}.json`;
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

  async getCrawledUrl(crawlId: string): Promise<string> {
    try {
      const files = await this.s3Service.listObjects(`crawls/${crawlId}/`);
      if (!files || files.length === 0) {
        throw new Error(`No crawled content found for crawlId: ${crawlId}`);
      }

      // For now, we'll just get the first file's content
      const firstFile = files[0];
      const content: { url: string } = await this.s3Service.getJson(firstFile);
      return `${content.url}`;

    } catch (error) {
      this.logger.error('Failed to get crawled content', {
        crawlId,
        error: error instanceof Error ? error.stack : String(error)
      });
      throw error;
    }
  }

  async getCrawledContent(crawlId: string, url: string): Promise<string> {
    const content: string = await this.s3Service.getJson(`crawls/${crawlId}/${url}.json`);
    return content;
  }
} 