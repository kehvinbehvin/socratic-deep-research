import { Clarification } from '../entities/Clarification';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { ClarificationStageData, GenericQueueDTO, QueryPreparationStageData } from '../types/dtos';
import { QueueHandler } from './QueueHandler';
import { LangChainService } from '../services/LangChainService';
import { z } from 'zod';
import { Reflection, Topic } from '../entities';
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
      where: { id: input.core.topicId },
      relations: ['clarifications', 'reflections']
    });

    const systemPrompt = `You are a search query optimization expert. You are continuing a Socratic dialogue to help someone understand how to do a real-world task
    The user has a goal or task they want to achieve in the real world.

    Given a topic, the user has already thought about questions that need to be answered,
    - about questions that need to be answered
    - about reflections that need to be considered
    - about clarifications that need to be made
    
    Your job is to help the user achieve their goal by generating search queries that will help them find the information they need based
    on all these points.  

    Your task is to understand/analyse all these points and generate search queries that will help the user find the information they need.

    For each query:
    - Focus on finding specific, factual information
    - Include relevant technical terms and keywords
    - Ensure queries are specific enough to return high-quality results
    - Extract a key keyword that represents the main concept

    `;

    const userPrompt = `
Topic: {topic}

Clarifications: {clarifications}

Reflections: {reflections}

Generate search queries based on the above points.
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
        clarifications: topic.clarifications.map(c => c.content).join('\n\n'),
        reflections: topic.reflections.map(r => r.content).join('\n\n')
      }
    });

    console.log('Result', { result });

    result.queries = result.queries.slice(0, 1);

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