import { QueueHandler } from './QueueHandler';
import { Topic } from '../entities/Topic';
import { Question } from '../entities/Question';
import { QueueService } from '../services/QueueService';
import { DataSource } from 'typeorm';
import { QuestionStageData } from '../types/dtos';
import { TopicStageData } from '../types/dtos';
import { LangChainService } from '../services/LangChainService';
import { z } from 'zod';
import { GenericQueueDTO } from '../types/dtos';
import { PromptService } from '../services/PromptService';

// Define the schema for LLM output
const QuestionOutputSchema = z.object({
  questions: z.array(z.object({
    content: z.string(),
  }))
});

export class TopicHandler extends QueueHandler<TopicStageData, QuestionStageData, Question> {
  private langChainService: LangChainService;
  private promptService: PromptService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    langChainService: LangChainService,
    promptService: PromptService
  ) {
    super(queueService, dataSource, Topic, 'TOPIC', 'QUESTION');
    this.langChainService = langChainService;
    this.promptService = promptService;
  }

  protected async transformQueueMessage(entities: Question[], prevMessage: GenericQueueDTO<TopicStageData>): Promise<GenericQueueDTO<QuestionStageData>> {
    console.log('Transforming queue message', { entities, prevMessage });

    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: {
        ...prevMessage.previousStages,
        questions: entities.map(entity => entity.id)
      },
      currentStage: {
        questions: entities.map(entity => entity.content)
      }
    }
  }

  protected async process(input: GenericQueueDTO<TopicStageData>): Promise<Question[]> {
    console.log('Processing input', { input });

    const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ 
      where: { id: input.core.topicId }
    });

    const systemPrompt = this.promptService.getSystemPrompt('question_generation');
    const userPrompt = this.promptService.getUserPrompt('question_generation');

    const result = await this.langChainService.generateStructured({
      systemPrompt,
      userPrompt,
      schema: QuestionOutputSchema,
      input: { topic: topic.content },
      useRetrieval: true,
      searchQuery: topic.content,
      topK: 3
    });

    // Create and save Question entities
    const questions = await Promise.all(
      result.questions.map(async (q) => {
        const question = new Question();
        question.content = q.content;
        question.topic = topic;
        return await this.dataSource.getRepository(Question).save(question);
      })
    );

    return questions;
  }
} 