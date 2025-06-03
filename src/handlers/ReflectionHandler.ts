import { Reflection } from '../entities/Reflection';
import { Clarification } from '../entities/Clarification';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { QueueHandler } from './QueueHandler';
import { ClarificationStageData, GenericQueueDTO, ReflectionStageData } from '../types/dtos';

export class ReflectionHandler extends QueueHandler<ReflectionStageData, ClarificationStageData, Clarification> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      Reflection,
      'REFLECTION',
      'CLARIFICATION'
    );
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(entities: Clarification[], prevMessage: GenericQueueDTO<ReflectionStageData>): Promise<GenericQueueDTO<ClarificationStageData>> {
    // Extract just the fields we need from the queue message
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
        clarifications: entities.map(entity => entity.content)
      }
    }
  }

  protected async process(input: GenericQueueDTO<ReflectionStageData>): Promise<Clarification[]> {
    // Implementation here...
    return [] as Clarification[]; // Placeholder
  }
} 