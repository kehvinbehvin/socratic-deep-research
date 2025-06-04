import { QueueHandler } from './QueueHandler';
import { Question } from '../entities/Question';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { GenericQueueDTO, QuestionStageData, ReflectionStageData } from '../types/dtos';
import { Reflection, Topic } from '../entities';

// Union type for all possible inputs
export class QuestionHandler extends QueueHandler<QuestionStageData, ReflectionStageData, Reflection> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      Question,
      'QUESTION',
      'REFLECTION'
    );
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(entities: Reflection[], prevMessage: GenericQueueDTO<QuestionStageData>): Promise<GenericQueueDTO<ReflectionStageData>> {
    // Extract just the fields we need from the queue message
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
        reflections: entities.map(entity => entity.content)
      }
    }
  }

  protected async process(input: GenericQueueDTO<QuestionStageData>): Promise<Question[]> {
    const topic = input.currentStage.questions[0];
    
    // Create mock questions
    const mockQuestions = [
      "What are the key principles and concepts that form the foundation of this topic?",
      "How does this topic relate to or impact real-world applications?",
      "What are the current challenges or limitations in this area?",
      "How has this field evolved over time, and what future developments are expected?",
      "What are the ethical considerations or implications associated with this topic?"
    ];

    // Create and save question entities
    const questions = await Promise.all(
      mockQuestions.map(async (content) => {
        const question = new Question();
        question.content = content;
        const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ where: { id: input.core.topicId }});
        question.topic = topic;
        return await this.dataSource.getRepository(Question).save(question);
      })
    );

    return questions;
  }
} 