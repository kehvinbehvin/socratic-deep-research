import { APIHandler } from './APIHandler';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { CrawlRequest } from '../entities/CrawlRequest';
import { CrawlResult } from '../entities/CrawlResult';
import { Page } from '../entities/Page';
import { FireCrawlService } from '../services/FireCrawlService';
import { LangChainService } from '../services/LangChainService';
import { S3Service } from '../services/S3Service';
import { ProcessingStatus } from '../entities/BaseEntity';
import { GenericQueueDTO, CrawlResultStageData } from '../types/dtos';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Define webhook request schema
export const FireCrawlWebhookSchema = z.object({
  success: z.boolean(),
  type: z.string(),
  id: z.string(),
  data: z.array(z.object({
    metadata: z.object({
      scrapeId: z.string(),
      url: z.string()
    }),
    markdown: z.string().optional()
  })).optional()
});

export type FireCrawlWebhookRequest = z.infer<typeof FireCrawlWebhookSchema>;

// Define the schema for LLM reliability analysis
const ReliabilityAnalysisSchema = z.object({
  reliability: z.number().min(0).max(100),
  rationale: z.string()
});

export class FireCrawlWebhookHandler extends APIHandler<FireCrawlWebhookRequest, CrawlResult[], GenericQueueDTO<CrawlResultStageData>> {
  private fireCrawlService: FireCrawlService;
  private langChainService: LangChainService;
  private s3Service: S3Service;

  constructor(
    queueService: QueueService, 
    dataSource: DataSource,
    fireCrawlService: FireCrawlService,
    langChainService: LangChainService,
    s3Service: S3Service
  ) {
    super(queueService, dataSource, 'CRAWL');
    this.fireCrawlService = fireCrawlService;
    this.langChainService = langChainService;
    this.s3Service = s3Service;
  }

  protected async transformQueueMessage(entities: CrawlResult[]): Promise<GenericQueueDTO<CrawlResultStageData>> {
    if (entities.length === 0) {
      throw new Error('No crawl results to process');
    }

    const firstEntity = entities[0];
    return {
      core: {
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: ProcessingStatus.PENDING,
        error: undefined,
        topicId: firstEntity.topic.id
      },
      previousStages: {
        crawlResults: entities.map(entity => entity.id)
      },
      currentStage: {
        crawlResults: entities.map(entity => entity.id)
      }
    };
  }

  private async storePageContent(crawlId: string, content: string): Promise<string> {
    const s3Key = `pages/${crawlId}/${Date.now()}.md`;
    await this.s3Service.uploadJson(s3Key, { content });
    return s3Key;
  }

  private async getPageContent(s3Key: string): Promise<string> {
    const data = await this.s3Service.getMarkdown(s3Key);
    return data;
  }

  private async createPageEntity(crawlRequest: CrawlRequest, pageData: any, s3Key: string): Promise<Page> {
    const metadata = pageData.metadata;
    const page = new Page();
    
    // Use og:url or url as fallback
    page.url = metadata['og:url'] || metadata.url;
    
    // Use og:title, or title as fallback
    page.title = metadata['og:title'] || metadata.title;
    
    // Use og:description or ogDescription as fallback
    page.description = metadata['og:description'] || metadata.ogDescription;
    
    // Use article:published_time, publishedTime as fallback
    page.publishedDate = metadata['article:published_time'] || metadata.publishedTime;
    
    // Use author directly
    page.author = metadata.author;
    
    // Extract domain from URL
    page.domain = new URL(page.url).hostname;
    
    // Store content length
    page.contentLength = pageData.markdown?.length || 0;
    
    // Store S3 key for content
    page.s3Key = s3Key;
    
    // Link to topic
    page.topic = crawlRequest.topic;

    // Add additional metadata
    page.lastModified = metadata['article:modified_time'] || metadata.modifiedTime;
    page.language = metadata.language;
    page.contentType = metadata.contentType;
    page.sourceUrl = metadata.sourceURL;
    page.scrapeId = metadata.scrapeId;

    return this.dataSource.getRepository(Page).save(page);
  }

  private async analyzeReliability(page: Page, topic: string): Promise<z.infer<typeof ReliabilityAnalysisSchema>> {
    const content = await this.getPageContent(page.s3Key);
    console.log('content for analysis', content.length);
    console.log('topic for analysis', topic.length);
    
    const systemPrompt = `You are an expert at evaluating web content reliability and credibility.
Your task is to analyze crawled web content and generate a comprehensive reliability score.

Consider these key factors:
1. Source Authority (Domain reputation, author expertise)
2. Content Quality (Writing quality, structure, depth)
3. Information Accuracy (Factual correctness, consistency)
4. Citations and References (Links to credible sources, bibliography)
5. Content Recency (Publication date, updates)

For each URL's content:
- Analyze the content objectively
- Consider all reliability factors
- Provide a detailed rationale
- Generate factor-specific scores
- Calculate an overall reliability score (0-100)`;

    const userPrompt = `Analyze this content about {topic}:

{content}

Format your response as a JSON object as follows.
Generate a reliability analysis with:
- Overall reliability score (0-100)
- Using a framework that considers the following factors:
  * Source Authority
  * Content Quality
  * Information Accuracy
  * Citations and References
  * Content Recency

Example JSON without curly braces:
  "reliability": 85,
  "rationale": "The content is well-written and provides valuable information. The author is an expert in the field and the content is up-to-date.",
`;

    return this.langChainService.generateStructured({
      systemPrompt,
      userPrompt,
      schema: ReliabilityAnalysisSchema,
      input: { topic, content }
    });
  }

  protected async process(request: FireCrawlWebhookRequest): Promise<CrawlResult[]> {
    // Validate webhook request
    if (!request.success || request.type !== 'crawl.completed' || !request.id) {
      if (request.type === 'crawl.failed') {
        const crawlRequest = await this.dataSource.getRepository(CrawlRequest).findOne({
          where: { fireCrawlId: request.id }
        });
        if (crawlRequest) {
          crawlRequest.status = ProcessingStatus.FAILED;
          await this.dataSource.getRepository(CrawlRequest).save(crawlRequest);
        }
        return [];
      }

      this.logger.error('Invalid webhook request', { request });
      return [];
    }

    // Find the corresponding crawl request
    const crawlRequest = await this.dataSource.getRepository(CrawlRequest).findOne({
      where: { fireCrawlId: request.id },
      relations: ['topic']
    });

    if (!crawlRequest) {
      throw new Error(`No crawl request found for FireCrawl ID: ${request.id}`);
    }

    // Fetch full crawl results from FireCrawl API
    const fireCrawlToken = process.env.FC_API_KEY;
    if (!fireCrawlToken) {
      throw new Error('FIRECRAWL_API_TOKEN environment variable is not set');
    }

    this.logger.info('Fetching crawl results from FireCrawl', { crawlId: request.id });
    
    const response = await fetch(`https://api.firecrawl.dev/v1/crawl/${request.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fireCrawlToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch crawl results: ${response.statusText}`);
    }

    const crawlResults = await response.json();

    if (!crawlResults.success || !crawlResults.data || !Array.isArray(crawlResults.data)) {
      throw new Error('Invalid crawl results format from FireCrawl API');
    }

    this.logger.info('Crawl results size', { size: crawlResults.data.length });

    // Mark crawl request as completed
    crawlRequest.status = ProcessingStatus.COMPLETED;
    await this.dataSource.getRepository(CrawlRequest).save(crawlRequest);

    const results: CrawlResult[] = [];

    // Process each crawled page
    for (const pageData of crawlResults.data) {
      try {
        // Store content in S3
        const s3Key = await this.storePageContent(request.id, pageData.markdown || '');
        
        // Create and save Page entity
        const page = await this.createPageEntity(crawlRequest, pageData, s3Key);

        // Analyze content reliability
        const reliabilityAnalysis = await this.analyzeReliability(page, crawlRequest.topic.content);

        // Create and save CrawlResult
        const crawlResult = new CrawlResult();
        crawlResult.url = page.url;
        crawlResult.topic = crawlRequest.topic;
        crawlResult.page = page;
        crawlResult.reliability = reliabilityAnalysis.reliability / 100; // Convert to 0-1 scale
        
        await this.dataSource.getRepository(CrawlResult).save(crawlResult);
        results.push(crawlResult);

        this.logger.info('Successfully processed page', { 
          url: page.url,
          reliability: crawlResult.reliability
        });
      } catch (error) {
        this.logger.error('Error processing page', { 
          error, 
          pageUrl: pageData.metadata?.url || 'unknown'
        });
      }
    }

    return results;
  }

  protected validateRequest(body: unknown): FireCrawlWebhookRequest {
    return FireCrawlWebhookSchema.parse(body);
  }

  protected validateHeaders(headers: Record<string, string | undefined>): void {
    const secretKey = headers['xRelocateKey'];
    if (secretKey !== process.env.X_RELOCATE_KEY) {
      throw new Error('Unauthorized: Invalid webhook key');
    }
  }
} 