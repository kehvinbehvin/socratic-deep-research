import { QueueHandler } from './QueueHandler';
import { Topic } from '../entities/Topic';
import { Question } from '../entities/Question';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { ProcessingStatus } from '../entities/BaseEntity';
import { QuestionStageData, QueueQuestionDTO, QueueTopicDTO } from '../types/dtos';
import { TopicStageData } from '../types/dtos';
import { LangChainService } from '../services/LangChainService';
import { z } from 'zod';
import { GenericQueueDTO } from '../types/dtos';

// Define the schema for LLM output
const QuestionOutputSchema = z.object({
  questions: z.array(z.object({
    content: z.string(),
    type: z.enum(['principle', 'application', 'challenge', 'evolution', 'ethics']),
    reasoning: z.string()
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

    const systemPrompt = `You are a Socratic tutor helping students explore topics deeply through thoughtful questions.
Your task is to generate 5 insightful questions about the given topic.
Each question should:
- Challenge assumptions
- Encourage critical thinking
- Promote deeper understanding
- Be specific and focused
- Include clear reasoning for why it's important

Categorize each question as one of:
- principle (foundational concepts)
- application (practical use)
- challenge (common difficulties)
- evolution (how it changes over time)
- ethics (moral/social implications)`;

    const userPrompt = `Generate 5 Socratic questions about: {topic}
Format your response as a JSON object with an array of questions.
Each question should have:
- content: the actual question
- type: the category it belongs to
- reasoning: why this question is important for understanding the topic`;

    const result = await this.langChainService.generateStructured({
      systemPrompt,
      userPrompt,
      schema: QuestionOutputSchema,
      input: { topic: topic.content }
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