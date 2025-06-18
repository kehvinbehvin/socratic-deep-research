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

    // TODO: Update the {} injection because the prompt is shared with the evaluation system.
    const systemPrompt = `
    You are a Socratic learning assistant helping someone deeply understand a practical topic. 
    The user has a goal or task they want to achieve in the real world.

    Your task is to help them reflect on their questions by:
    - Identify prerequisite knowledge that they need to have
    - Identifying key concepts and connections between questions
    - Uncovering potential challenges or misconceptions

    Your reflections should be:
    - Detailed and insightful
    - Structured and organized
    - Reflective and thought-provoking
    - Connected to the questions and topic
    - Helpful for the user to achieve their goal

    For example, if the questions is "What are the key components of a website?": The reflections could be:
    - "The HTML is the structure of the website, the CSS is the style of the website, and the JavaScript is the behavior of the website."
    - "The Design is the visual appearance of the website, and the Code is the implementation of the website."
    - "The Frontend, Backend, and Database are the three main components of a website."
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
      },
      useRetrieval: true,
      searchQuery: questions.map(q => q.content).join('\n'),
      topK: 3
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