import { S3Service } from '../services/S3Service';
import { LoggerService } from '../services/LoggerService';

export class FireCrawlService {
  private s3Service: S3Service;
  private logger: LoggerService;

  constructor(s3Service: S3Service, logger: LoggerService) {
    this.s3Service = s3Service;
    this.logger = logger;
  }

  async crawl(url: string): Promise<void> {
    try {
      // Use FireCrawl to get webpage content
      const response = await fetch(url);
      const html = await response.text();

      // Extract main content using FireCrawl's content extraction
      const content = await this.extractContent(html);

      // Upload to S3
      const s3Key = `crawls/${Buffer.from(url).toString('base64')}.json`;
      await this.s3Service.uploadJson(s3Key, {
        url,
        content,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to crawl URL', {
        url,
        error: error instanceof Error ? error.stack : String(error)
      });
      throw error;
    }
  }

  private async extractContent(html: string): Promise<string> {
    // TODO: Implement proper content extraction
    // For now, just return the raw HTML
    return html;
  }
} 