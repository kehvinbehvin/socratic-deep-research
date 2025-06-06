import { CrawlResult } from '../entities/CrawlResult';
import { QueueService } from '../services/QueueService';
import { S3Service } from '../services/S3Service';
import { DataSource } from 'typeorm';
import { CrawlResultStageData, GenericQueueDTO, ReviewStageData } from '../types/dtos';
import { Review } from '../entities/Review';
import { Page, Topic } from '../entities';
import { QueueHandler } from './QueueHandler';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { LangChainService } from '../services/LangChainService';
import { z } from 'zod';
import { QdrantVectorStoreService } from '../services/QdrantVectorStoreService';

// Define schema for relevance scoring
const RelevanceSchema = z.object({
  relevance: z.number().min(0).max(1),
  rationale: z.string()
});

export class CrawlResultHandler extends QueueHandler<CrawlResultStageData, ReviewStageData, Review> {
  private s3Service: S3Service;
  private langChainService: LangChainService;
  private textSplitter: RecursiveCharacterTextSplitter;
  private qdrantVectorStoreService: QdrantVectorStoreService;
  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    s3Service: S3Service,
    langChainService: LangChainService,
    qdrantVectorStoreService: QdrantVectorStoreService
  ) {
    super(
      queueService,
      dataSource,
      CrawlResult,
      'CRAWL',
      'REVIEW'
    );
    this.s3Service = s3Service;
    this.langChainService = langChainService;
    this.qdrantVectorStoreService = qdrantVectorStoreService;
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    });
  }

  private async generateRelevanceScore(chunk: string, topic: string): Promise<z.infer<typeof RelevanceSchema>> {
    const systemPrompt = `You are an expert at evaluating content relevance.
Your task is to analyze a chunk of content and determine its relevance to a given topic.
Provide a relevance score between 0 and 1, where:
- 1.0: Highly relevant, directly addresses the topic
- 0.7-0.9: Very relevant, contains important information about the topic
- 0.4-0.6: Moderately relevant, tangentially related to the topic
- 0.1-0.3: Slightly relevant, mentions concepts related to the topic
- 0.0: Not relevant at all`;

    const userPrompt = `Topic: {topic}
Content chunk: {chunk}

Rate the relevance of this content to the topic on a scale of 0-1 and explain why.`;

    return this.langChainService.generateStructured({
      systemPrompt,
      userPrompt,
      schema: RelevanceSchema,
      input: { topic, chunk }
    });
  }

  protected async transformQueueMessage(entities: Review[], prevMessage: GenericQueueDTO<CrawlResultStageData>): Promise<GenericQueueDTO<ReviewStageData>> {
    // Only pass IDs to avoid circular references
    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: {
        reviews: entities.map(entity => entity.crawlResult?.id).filter(Boolean)
      },
      currentStage: {
        reviews: entities.map(entity => entity.chunkId)
      }
    };
  }

  protected async process(input: GenericQueueDTO<CrawlResultStageData>): Promise<Review[]> {
    console.log(`Processing ${input.currentStage.crawlResults.length} crawl results`)
    try {
      // Get the topic
      const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ 
        where: { id: input.core.topicId }
      });

      const allReviews: Review[] = [];

      this.logger.info(`Processing ${input.currentStage.crawlResults.length} crawl results`)

      // Process each crawl result
      for (const id of input.currentStage.crawlResults) {
        try {
          // Get crawl result
          const crawlResult = await this.dataSource.getRepository(CrawlResult).findOneOrFail({ 
            where: { id },
          });

          console.log(`Processing crawl result ${id}`, {
            crawlResultUrl: crawlResult.url
          });

          // Get crawl result with page relation
          const page = await this.dataSource.getRepository(Page)
          .createQueryBuilder("page")
          .leftJoinAndSelect("page.crawlResult", "crawlResult")
          .where("crawlResult.id = :id", { id })
          .getOne();

          console.log(`Page: ${JSON.stringify(page)}`);

          if (!page) {
            this.logger.error(`No page found for crawl result ${id}`, {
              crawlResultUrl: id
            });
            continue;
          }

          // Get content from S3
          const content: string = await this.s3Service.getMarkdown(page.s3Key);

          console.log(`Content: ${content}`, {
            snippet: content.slice(0, 100)
          });

          if (!content) {
            this.logger.error(`No content found for crawl result ${id}`, {
              crawlResultUrl: id
            });
            continue;
          }
          
          // Split content into chunks
          const chunks = await this.textSplitter.splitText(content);
          
          this.logger.info(`Processing chunks for crawl result ${id}`, {
            numChunks: chunks.length,
            crawlResultUrl: id
          });

          // Process each chunk
          const chunkReviews = await Promise.all(chunks.map(async (chunk: string, index: number) => {
            try {
              // Generate relevance score
              const relevanceResult = await this.generateRelevanceScore(chunk, topic.content);

              // Index the chunk in Qdrant with metadata
              const vectorId = await this.qdrantVectorStoreService.indexText(chunk, {
                topic: topic.content,
                topicId: topic.id,
                relevance: relevanceResult.relevance,
                rationale: relevanceResult.rationale,
                crawlResultId: id,
                pageUrl: page.url,
                chunkIndex: index + 1
              });
              
              // Create review entity
              const review = new Review();
              review.chunkId = vectorId;
              review.content = chunk;
              review.relevance = relevanceResult.relevance;
              review.topic = topic;
              review.crawlResult = crawlResult;
              
              return await this.dataSource.getRepository(Review).save(review);
            } catch (error) {
              this.logger.error(`Error processing chunk ${index + 1} for crawl result ${id}`, {
                error,
                chunkLength: chunk.length
              });
              return null;
            }
          }));

          // Filter out any failed chunks and add to overall reviews
          allReviews.push(...chunkReviews.filter((r: Review | null): r is Review => r !== null));

        } catch (error) {
          this.logger.error(`Error processing crawl result ${id}`, {
            error
          });
          // Continue with next crawl result
          continue;
        }
      }

      this.logger.info('Completed processing all crawl results', {
        totalReviews: allReviews.length
      });

      return allReviews;
    } catch (error) {
      this.logger.error('Error in CrawlResultHandler process', {
        error,
        input
      });
      throw error;
    }
  }
} 