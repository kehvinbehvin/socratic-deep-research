import { BaseHandler } from './BaseHandler';
import { CrawlResult } from '../entities/CrawlResult';
import { Review } from '../entities/Review';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { S3Service } from '../services/S3Service';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';
import { z } from 'zod';

// Schema for queue messages
export const ReviewQueueSchema = z.object({
  id: z.string().uuid(),
  crawlResultId: z.string().uuid()
});

export type ReviewQueueInput = z.infer<typeof ReviewQueueSchema>;

// Schema for source reliability assessment
const ReliabilitySchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  credibilityFactors: z.array(z.string()),
  potentialBiases: z.array(z.string())
});

type ReliabilityAssessment = z.infer<typeof ReliabilitySchema>;

export class ReviewHandler extends BaseHandler<ReviewQueueInput, Review> {
  private openAIService: OpenAIService;
  private s3Service: S3Service;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService,
    s3Service: S3Service
  ) {
    super(
      queueService,
      dataSource,
      Review,
      QUEUE_NAMES.REVIEW,
      QUEUE_NAMES.COMPLETE
    );
    this.openAIService = openAIService;
    this.s3Service = s3Service;
  }

  protected async transformQueueMessage(message: any): Promise<ReviewQueueInput> {
    // Extract just the fields we need from the queue message
    const { id, crawlResultId } = message.entity;
    return { id, crawlResultId };
  }

  protected async process(input: ReviewQueueInput): Promise<Review> {
    const crawlResult = await this.dataSource
      .getRepository(CrawlResult)
      .findOne({
        where: { id: input.id },
        relations: ['searchResult', 'searchResult.searchQuery']
      });

    if (!crawlResult) {
      throw new Error(`Crawl result not found: ${input.id}`);
    }

    // TODO: Implement OpenAI, S3, and VectorDB integration
    // const reviewResults = [];
    // for (const result of crawlResult.results) {
    //   if (!result.success || !result.s3Key) continue;
    //   try {
    //     const content = await this.s3Service.getFile(result.s3Key);
    //     const reliability = await this.openAIService.generateStructuredOutput(reliabilityPrompt, ReliabilitySchema);
    //     const chunks = this.splitIntoChunks(content);
    //     const scoredChunks = [];
    //     // ... rest of the processing
    //   } catch (error) {
    //     reviewResults.push({ url: result.url, error: String(error), success: false });
    //   }
    // }

    // Create stub results for testing
    const reviewResults = crawlResult.results.map(result => ({
      url: result.url,
      title: result.title,
      reliability: {
        score: 8,
        reasoning: 'Stub reasoning for testing',
        credibilityFactors: ['Stub factor 1', 'Stub factor 2'],
        potentialBiases: ['Stub bias 1']
      },
      relevantChunks: [
        {
          content: `Stub chunk 1 for ${result.url}`,
          relevanceScore: 8
        },
        {
          content: `Stub chunk 2 for ${result.url}`,
          relevanceScore: 7
        }
      ],
      success: true
    }));

    // Create review entity
    const review = new Review();
    review.crawlResult = crawlResult;
    review.results = reviewResults;
    review.status = ProcessingStatus.COMPLETED; // This is the end of the pipeline

    return review;
  }

  private splitIntoChunks(content: string, maxChunkSize: number = 1000): string[] {
    // Simple splitting by sentences and combining into chunks
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
} 