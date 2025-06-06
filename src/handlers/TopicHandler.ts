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

// Define the schema for LLM output
const QuestionOutputSchema = z.object({
  questions: z.array(z.object({
    content: z.string(),
  }))
});

export class TopicHandler extends QueueHandler<TopicStageData, QuestionStageData, Question> {
  private langChainService: LangChainService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    langChainService: LangChainService
  ) {
    super(queueService, dataSource, Topic, 'TOPIC', 'QUESTION');
    this.langChainService = langChainService;
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

    const systemPrompt = `
    You are a Socratic learning assistant helping someone deeply understand a practical topic. 
    The user will provide a goal or task they want to achieve in the real world.
    Your task is to generate 5 Socratic questions that will help the user achieve their goal.

    Your questions should be:
    - Be asked in a way where the answers will lead the user down a path of discovery that will lead to a deeper understanding of what is needed to achieve the goal
    - Considered from a practical / common sense perspective of the goal/task/topic
    - Helpful for the user to achieve their goal
    - Be broad.

    For example, topic is "How to build a website"
    Question could be 
    - "What is a website?"
    - "What kind of website are there and why do they differ?"
    - "Given each type of websites, what are the key features and differences?"
    - "What are the key components of a website?"
    - "What are the common steps to build a website?"
    - "What kind of skills are needed to build a website?"
    - "What are the key mistakes to build a website?"
    - "What are the key resources to build a website?"
    `;

    const userPrompt = `Generate 5 questions about the following topic: {topic}
Format your response as a JSON object with an array of questions.
Each question should have:
- content: the actual question
`;

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