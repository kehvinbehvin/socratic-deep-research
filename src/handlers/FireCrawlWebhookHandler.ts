import { APIHandler } from './APIHandler';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { CrawlRequest } from '../entities/CrawlRequest';
import { CrawlResult } from '../entities/CrawlResult';
import { FireCrawlService } from '../services/FireCrawlService';
import { LangChainService } from '../services/LangChainService';
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
  rationale: z.string(),
  factors: z.object({
    sourceAuthority: z.number().min(0).max(100),
    contentQuality: z.number().min(0).max(100),
    informationAccuracy: z.number().min(0).max(100),
    citationsAndReferences: z.number().min(0).max(100),
    contentRecency: z.number().min(0).max(100)
  })
});

export class FireCrawlWebhookHandler extends APIHandler<FireCrawlWebhookRequest, CrawlResult[], GenericQueueDTO<CrawlResultStageData>> {
  private fireCrawlService: FireCrawlService;
  private langChainService: LangChainService;

  constructor(
    queueService: QueueService, 
    dataSource: DataSource,
    fireCrawlService: FireCrawlService,
    langChainService: LangChainService
  ) {
    super(queueService, dataSource, 'CRAWL');
    this.fireCrawlService = fireCrawlService;
    this.langChainService = langChainService;
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
      previousStages: {},
      currentStage: {
        crawlResults: entities.map(entity => entity.url)
      }
    };
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

    // Mark crawl request as completed
    crawlRequest.status = ProcessingStatus.COMPLETED;
    await this.dataSource.getRepository(CrawlRequest).save(crawlRequest);

    // Fetch and store crawl data
    await this.fireCrawlService.handleWebhookResponse(request.id);
    // Get the stored content for analysis
    const s3URL: string = await this.fireCrawlService.getCrawledUrl(request.id);

    const content = await this.fireCrawlService.getCrawledContent(request.id, s3URL);

    // Analyze content reliability using LLM
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

Generate a reliability analysis with:
- Overall reliability score (0-100)
- Detailed rationale
- Individual factor scores for:
  * Source Authority
  * Content Quality
  * Information Accuracy
  * Citations and References
  * Content Recency`;

    const result = await this.langChainService.generateStructured({
      systemPrompt,
      userPrompt,
      schema: ReliabilityAnalysisSchema,
      input: {
        topic: crawlRequest.topic.content,
        content
      }
    });

    // Create CrawlResult entity
    const crawlResult = new CrawlResult();
    crawlResult.url = s3URL;
    crawlResult.topic = crawlRequest.topic;
    crawlResult.reliability = result.reliability / 100; // Convert to 0-1 scale
    
    // Save the crawl result
    await this.dataSource.getRepository(CrawlResult).save(crawlResult);

    return [crawlResult];
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