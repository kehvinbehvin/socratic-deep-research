import { Reflection } from '../entities/Reflection';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { ReflectionStageData, GenericQueueDTO, ClarificationStageData } from '../types/dtos';
import { QueueHandler } from './QueueHandler';
import { LangChainService } from '../services/LangChainService';
import { z } from 'zod';
import { Topic } from '../entities';
import { Clarification } from '../entities/Clarification';

// Define the schema for LLM output
const ClarificationOutputSchema = z.object({
  clarifications: z.array(z.object({
    content: z.string(),
    type: z.enum(['methodology', 'metrics', 'integration', 'comparison', 'limitation']),
    importance: z.number().min(1).max(5),
    rationale: z.string()
  }))
});

export class ReflectionHandler extends QueueHandler<ReflectionStageData, ClarificationStageData, Clarification> {
  private langChainService: LangChainService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    langChainService: LangChainService
  ) {
    super(
      queueService,
      dataSource,
      Clarification,
      'REFLECTION',
      'CLARIFICATION'
    );
    this.langChainService = langChainService;
  }

  protected async transformQueueMessage(entities: Clarification[], prevMessage: GenericQueueDTO<ReflectionStageData>): Promise<GenericQueueDTO<ClarificationStageData>> {
    console.log('Transforming queue message', { entities, prevMessage });
    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: {
        ...prevMessage.previousStages,
        clarifications: entities.map(entity => entity.id)
      },
      currentStage: {
        clarifications: entities.map(entity => entity.content)
      }
    }
  }

  protected async process(input: GenericQueueDTO<ReflectionStageData>): Promise<Clarification[]> {
    console.log('Processing input', { input });
    // Get the topic and its reflections
    const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ 
      where: { id: input.core.topicId }
    });

    if (!input.previousStages.reflections || input.previousStages.reflections.length === 0) {
      throw new Error('No reflections found in previous stage');
    }

    const reflections = await this.dataSource.getRepository(Reflection).findByIds(
      input.previousStages.reflections
    );

    if (reflections.length === 0) {
      throw new Error('Could not find any reflections with the provided IDs');
    }

    const systemPrompt = `You are a Socratic tutor analyzing student reflections to identify areas that need clarification.
Your task is to generate specific points that require further investigation or clarification.
Each clarification should:
- Focus on a specific aspect that needs deeper understanding
- Be categorized by type:
  * methodology (how something works)
  * metrics (how to measure or evaluate)
  * integration (how things work together)
  * comparison (how it relates to alternatives)
  * limitation (what are the constraints)
- Include a clear rationale for why this clarification is important
- Rate the importance (1-5) of resolving this clarification

Generate 5 clarifications that will help deepen understanding of the topic.`;

    const userPrompt = `Based on these reflections about {topic}:
{reflections}

Identify key points that need clarification.
Format your response as a JSON object with an array of clarifications.
Each clarification should have:
- content: the specific point needing clarification
- type: the category of clarification needed
- importance: number from 1-5 indicating how critical this clarification is
- rationale: why this clarification is important for understanding the topic`;

    const result = await this.langChainService.generateStructured({
      systemPrompt,
      userPrompt,
      schema: ClarificationOutputSchema,
      input: { 
        topic: topic.content,
        reflections: reflections.map(r => r.content).join('\n\n')
      }
    });

    // Create and save Clarification entities
    const clarifications = await Promise.all(
      result.clarifications.map(async (c) => {
        const clarification = new Clarification();
        clarification.content = c.content;
        clarification.topic = topic;
        return await this.dataSource.getRepository(Clarification).save(clarification);
      })
    );

    return clarifications;
  }
} 