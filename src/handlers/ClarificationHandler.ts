import { Clarification } from '../entities/Clarification';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { ClarificationStageData, GenericQueueDTO, QueryPreparationStageData } from '../types/dtos';
import { QueueHandler } from './QueueHandler';
import { LangChainService } from '../services/LangChainService';
import { z } from 'zod';
import { Topic } from '../entities';
import { QueryPreparation } from '../entities/QueryPreparation';

// Define the schema for LLM output
const QueryPreparationOutputSchema = z.object({
  queries: z.array(z.object({
    query: z.string(),
    keyword: z.string()
  }))
});

export class ClarificationHandler extends QueueHandler<ClarificationStageData, QueryPreparationStageData, QueryPreparation> {
  private langChainService: LangChainService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    langChainService: LangChainService
  ) {
    super(
      queueService,
      dataSource,
      QueryPreparation,
      'CLARIFICATION',
      'QUERY_PREPARATION'
    );
    this.langChainService = langChainService;
  }

  protected async transformQueueMessage(entities: QueryPreparation[], prevMessage: GenericQueueDTO<ClarificationStageData>): Promise<GenericQueueDTO<QueryPreparationStageData>> {
    console.log('Transforming queue message', { entities, prevMessage });
    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: {
        ...prevMessage.previousStages,
        queryPreparations: entities.map(entity => entity.id)
      },
      currentStage: {
        queries: entities.map(entity => entity.query),
        keywords: entities.map(entity => entity.keyword)
      }
    }
  }

  protected async process(input: GenericQueueDTO<ClarificationStageData>): Promise<QueryPreparation[]> {
    console.log('Processing input', { input });
    // Get the topic and its clarifications
    const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ 
      where: { id: input.core.topicId }
    });

    if (!input.previousStages.clarifications || input.previousStages.clarifications.length === 0) {
      throw new Error('No clarifications found in previous stage');
    }

    const clarifications = await this.dataSource.getRepository(Clarification).findByIds(
      input.previousStages.clarifications
    );

    if (clarifications.length === 0) {
      throw new Error('Could not find any clarifications with the provided IDs');
    }

    const systemPrompt = `You are a search query optimization expert.
Your task is to convert clarification points into effective search queries.
For each query:
- Focus on finding specific, factual information
- Include relevant technical terms and keywords
- Ensure queries are specific enough to return high-quality results
- Extract a key keyword that represents the main concept

Generate one search query for each clarification point.`;

    const userPrompt = `Based on these clarification points about {topic}:
{clarifications}

Generate search queries to find detailed information about each point.
Format your response as a JSON object with an array of queries.
Each query object should have:
- query: a well-formed search query that will return relevant results
- keyword: the main technical term or concept being searched`;

    const result = await this.langChainService.generateStructured({
      systemPrompt,
      userPrompt,
      schema: QueryPreparationOutputSchema,
      input: { 
        topic: topic.content,
        clarifications: clarifications.map(c => c.content).join('\n\n')
      }
    });

    // Create and save QueryPreparation entities
    const queryPreparations = await Promise.all(
      result.queries.map(async (q) => {
        const queryPrep = new QueryPreparation();
        queryPrep.query = q.query;
        queryPrep.keyword = q.keyword;
        queryPrep.topic = topic;
        return await this.dataSource.getRepository(QueryPreparation).save(queryPrep);
      })
    );

    return queryPreparations;
  }
} 