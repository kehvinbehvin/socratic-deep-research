import { BaseHandler } from './BaseHandler';
import { Reflection } from '../entities/Reflection';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';
import { Clarification } from '../entities/Clarification';
import { QueryPreparation } from '../entities/QueryPreparation';
import z from 'zod';
import { OpenAIService } from '../services/OpenAIService';

interface ClarificationInput {
  clarificationId: string;
  content: string;
}

const SearchQuerySchema = z.object({
  queries: z.array(z.string()),
  keywords: z.array(z.string()),
  reasoning: z.string(),
});

type SearchQueryOutput = z.infer<typeof SearchQuerySchema>;

export class ClarificationHandler extends BaseHandler<ClarificationInput, QueryPreparation> {
  private openAIService: OpenAIService;

  constructor(queueService: QueueService, dataSource: DataSource, openAIService: OpenAIService) {
    super(queueService, dataSource, Clarification, QUEUE_NAMES.CLARIFICATION, QUEUE_NAMES.QUERY_PREPARATION);
    this.openAIService = openAIService;
  }

  // Public method for handling web/API requests
  public async handleRequest(input: ClarificationInput): Promise<QueryPreparation> {
    return this.process(input);
  }

  // Protected method for internal queue processing
  protected async process(input: ClarificationInput): Promise<QueryPreparation> {
    const clarification = await this.dataSource
      .getRepository(Clarification)
      .findOne({ where: { id: input.clarificationId } });

    if (!clarification) {
      throw new Error(`Clarification not found: ${input.clarificationId}`);
    }

//     // Generate search queries using OpenAI
//     const prompt = `Given the following learning context:
// Topic: ${clarification.reflection.question.topic.content}
// Question: ${clarification.reflection.question.content}
// Reflection: ${clarification.reflection.content}
// Clarification: ${clarification.content}
// Clarifying Questions: ${clarification.clarifyingQuestions || 'N/A'}
// Suggestions: ${clarification.suggestions || 'N/A'}

// Generate 3-5 effective Google search queries that would help find relevant, high-quality information to address the clarifications and gaps identified. For each query:
// 1. Make it specific and targeted
// 2. Include relevant technical terms
// 3. Focus on reliable sources (e.g., academic, professional)

// Also provide a list of key terms/concepts that are crucial for understanding this topic.

// Format the response as:
// {
//   "queries": ["query1", "query2", ...],
//   "keywords": ["keyword1", "keyword2", ...],
//   "reasoning": "Explanation of why these queries and keywords were chosen"
// }`;

//     const searchQueryOutput = await this.openAIService.generateStructuredOutput(
//       prompt,
//       SearchQuerySchema
//     ) as SearchQueryOutput;

    // Create query preparation entity
    const queryPreparation = new QueryPreparation();
    queryPreparation.clarification = clarification;
    // queryPreparation.searchQueries = searchQueryOutput.queries.join('\n');
    // queryPreparation.keywords = searchQueryOutput.keywords.join(',');
    queryPreparation.searchQueries = 'test';
    queryPreparation.keywords = 'test';
    queryPreparation.status = ProcessingStatus.PENDING;

    return queryPreparation;
  }
} 