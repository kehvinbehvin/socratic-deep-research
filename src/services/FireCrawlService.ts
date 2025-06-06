import { S3Service } from '../services/S3Service';
import { LoggerService } from '../services/LoggerService';
import { Page } from '../entities/Page';
import { DataSource } from 'typeorm';
import { CentralizedMetricsService } from './CentralisedMetricsService';
import { MetricDefinitions } from '../metrics/definitions';

export class FireCrawlService {
  private dataSource: DataSource;
  private s3Service: S3Service;
  private logger: LoggerService;
  private metrics: CentralizedMetricsService;

  constructor(dataSource: DataSource, s3Service: S3Service, logger: LoggerService, metrics: CentralizedMetricsService) {
    this.dataSource = dataSource;
    this.s3Service = s3Service;
    this.logger = logger;
    this.metrics = metrics;
  }

  async createCrawlRequest(url: string): Promise<string> {
    const startTime = Date.now();
    const endpoint = 'firecrawl_crawl_request';
    const service = 'firecrawl';

    try {
      this.metrics.observe(MetricDefinitions.usage.apiCalls, 1, {
        service: service,
        operation: 'firecrawl_crawl_request_attempt',
        endpoint: endpoint,
      });

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

      // Record a successful API call
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observe(MetricDefinitions.usage.duration, duration, {
        service: service,
        endpoint: endpoint,
        status: 'success'
      });

      this.metrics.observe(MetricDefinitions.usage.apiCalls, 1, {
        service: service,
        operation: 'firecrawl_crawl_request_success',
        endpoint: endpoint,
      });

      const data = await response.json();
      console.log("FireCrawl response", data)

      if (!data.success) {
        throw new Error(data.error);
      }

      this.logger.info('FireCrawl request created', { url, crawlId: data.id });

      return data.id;

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observe(MetricDefinitions.usage.duration, duration, {
        service: service,
        endpoint: endpoint,
        status: 'error'
      });

      this.metrics.observe(MetricDefinitions.error.errorCount, 1, {
        service: service,
        category: 'firecrawl_crawl_request_error',
        message: error instanceof Error ? error.message : 'unknown',
        type: error instanceof Error ? error.name : 'unknown'
      });

      this.logger.error('Failed to create FireCrawl request', {
        url,
        error: error instanceof Error ? error.stack : String(error)
      });
      throw error;
    }
  }

  async handleWebhookResponse(crawlId: string): Promise<string> {
    const startTime = Date.now();
    const endpoint = 'firecrawl_crawl_webhook';
    const service = 'firecrawl';

    try {
      this.metrics.observe(MetricDefinitions.usage.apiCalls, 1, {
        service: service,
        operation: 'firecrawl_crawl_webhook_attempt',
        endpoint: endpoint,
      });

      const response = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FC_API_KEY}`
        },
      });

      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observe(MetricDefinitions.usage.duration, duration, {
        service: service,
        endpoint: endpoint,
        status: 'success'
      });

      this.metrics.observe(MetricDefinitions.usage.apiCalls, 1, {
        service: service,
        operation: 'firecrawl_crawl_webhook_success',
        endpoint: endpoint,
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
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observe(MetricDefinitions.usage.duration, duration, {
        service: service,
        endpoint: endpoint,
        status: 'error'
      });

      this.metrics.observe(MetricDefinitions.error.errorCount, 1, {
        service: service,
        category: 'firecrawl_crawl_webhook_error',
        message: error instanceof Error ? error.message : 'unknown',
        type: error instanceof Error ? error.name : 'unknown'
      });

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