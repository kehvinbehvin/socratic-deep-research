import { QueueHandler } from './QueueHandler';
import { Question } from '../entities/Question';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { GenericQueueDTO, QuestionStageData, ReflectionStageData } from '../types/dtos';
import { Reflection, Topic } from '../entities';
import { LangChainService } from '../services/LangChainService';
import { z } from 'zod';

// Define the schema for LLM output
const ReflectionOutputSchema = z.object({
  reflections: z.array(z.object({
    content: z.string(),
    depth: z.number().min(1).max(5),
    insights: z.array(z.string())
  }))
});

// Union type for all possible inputs
export class QuestionHandler extends QueueHandler<QuestionStageData, ReflectionStageData, Reflection> {
  private langChainService: LangChainService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    langChainService: LangChainService
  ) {
    super(
      queueService,
      dataSource,
      Reflection,
      'QUESTION',
      'REFLECTION'
    );
    this.langChainService = langChainService;
  }

  protected async transformQueueMessage(entities: Reflection[], prevMessage: GenericQueueDTO<QuestionStageData>): Promise<GenericQueueDTO<ReflectionStageData>> {
    console.log('Transforming queue message', { entities, prevMessage });
    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: {
        ...prevMessage.previousStages,
        reflections: entities.map(entity => entity.id)
      },
      currentStage: {
        reflections: entities.map(entity => entity.content)
      }
    }
  }

  protected async process(input: GenericQueueDTO<QuestionStageData>): Promise<Reflection[]> {
    console.log('Processing input', { input });
    // Get the topic and its questions
    const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ 
      where: { id: input.core.topicId }
    });

    if (!input.previousStages.questions || input.previousStages.questions.length === 0) {
      throw new Error('No questions found in previous stage');
    }

    const questions = await this.dataSource.getRepository(Question).findByIds(
      input.previousStages.questions
    );

    if (questions.length === 0) {
      throw new Error('Could not find any questions with the provided IDs');
    }

    const systemPrompt = `
    You are a Socratic learning assistant helping someone deeply understand a practical topic. 
    The user has a goal or task they want to achieve in the real world.

    Your job is to help them reflect by:
    - Assume no prior knowledge of the topic
    - Identifying key concepts and connections between questions
    - Uncovering potential challenges or misconceptions
    - Generating insights that deepen their understanding
    - Highlight potential pitfalls and misconceptions or
    - Providing a structured framework for reflection

    Your reflections should be:
    - Detailed and insightful
    - Structured and organized
    - Reflective and thought-provoking
    - Connected to the questions and topic
    - Helpful for the user to achieve their goal
    `;

    const userPrompt = `Generate reflections about the following questions:
{questions} regarding the topic: {topic}

Format your response as a JSON object with an array of reflections.
Each reflection should have:
- content: detailed reflection text that connects multiple questions and concepts
- depth: number from 1-5 indicating depth of understanding
- insights: array of key takeaways from this reflection`;

    const result = await this.langChainService.generateStructured({
      systemPrompt,
      userPrompt,
      schema: ReflectionOutputSchema,
      input: { 
        topic: topic.content,
        questions: questions.map(q => q.content).join('\n')
      }
    });

    // Create and save Reflection entities
    const reflections = await Promise.all(
      result.reflections.map(async (r) => {
        const reflection = new Reflection();
        reflection.content = r.content;
        reflection.topic = topic;
        return await this.dataSource.getRepository(Reflection).save(reflection);
      })
    );

    return reflections;
  }
} 