import { BaseHandler } from './BaseHandler';
import { QueryPreparation } from '../entities/QueryPreparation';
import { SearchQuery } from '../entities/SearchQuery';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';
import { z } from 'zod';

// Schema for queue messages
export const QueryPreparationQueueSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  clarificationId: z.string().uuid()
});

export type QueryPreparationQueueInput = z.infer<typeof QueryPreparationQueueSchema>;

// Schema for OpenAI response
const SearchQuerySchema = z.object({
  queries: z.array(z.string()),
  keywords: z.array(z.string()),
  reasoning: z.string()
});

type SearchQueryOutput = z.infer<typeof SearchQuerySchema>;

export class QueryPreparationHandler extends BaseHandler<QueryPreparationQueueInput, SearchQuery> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      SearchQuery,
      QUEUE_NAMES.QUERY_PREPARATION,
      QUEUE_NAMES.SEARCH
    );
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(message: any): Promise<QueryPreparationQueueInput> {
    // Extract just the fields we need from the queue message
    const { id, content, clarificationId } = message.entity;
    return { id, content, clarificationId };
  }

  protected async process(input: QueryPreparationQueueInput): Promise<SearchQuery> {
    const queryPrep = await this.dataSource
      .getRepository(QueryPreparation)
      .findOne({
        where: { id: input.id },
        relations: ['clarification', 'clarification.reflection', 'clarification.reflection.question', 'clarification.reflection.question.topic']
      });

    if (!queryPrep) {
      throw new Error(`Query preparation not found: ${input.id}`);
    }

    // TODO: Implement OpenAI integration
    // const searchQueryOutput = await this.openAIService.generateStructuredOutput(prompt, SearchQuerySchema);
    const searchQueryOutput = {
      queries: [
        `Stub search query 1 for: ${queryPrep.content}`,
        `Stub search query 2 for: ${queryPrep.content}`
      ],
      keywords: ['stub', 'keywords'],
      reasoning: 'Stub reasoning for testing'
    };

    // Create search query entity
    const searchQuery = new SearchQuery();
    searchQuery.queryPreparation = queryPrep;
    searchQuery.queries = searchQueryOutput.queries;
    searchQuery.keywords = searchQueryOutput.keywords;
    searchQuery.reasoning = searchQueryOutput.reasoning;
    searchQuery.status = ProcessingStatus.PENDING;

    return searchQuery;
  }
} 