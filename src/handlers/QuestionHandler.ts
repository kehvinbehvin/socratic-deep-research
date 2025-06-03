import { QueueHandler } from './QueueHandler';
import { Question } from '../entities/Question';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { GenericQueueDTO, QuestionStageData, ReflectionStageData } from '../types/dtos';
import { Reflection } from '../entities';

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

  protected async process(input: GenericQueueDTO<QuestionStageData>): Promise<Reflection[]> {
    // Implementation here...
    return [] as Reflection[]; // Placeholder
  }
} 