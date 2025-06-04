import { Reflection } from '../entities/Reflection';
import { Clarification } from '../entities/Clarification';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { QueueHandler } from './QueueHandler';
import { ClarificationStageData, GenericQueueDTO, ReflectionStageData } from '../types/dtos';
import { Topic } from '../entities';

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

  protected async process(input: GenericQueueDTO<ReflectionStageData>): Promise<Reflection[]> {
    // Create mock reflections based on the questions
    const mockReflections = [
      "The foundational principles appear to be interconnected with several key theoretical frameworks.",
      "Current real-world applications show promising results but face implementation challenges.",
      "There are significant technological and methodological limitations that need to be addressed.",
      "Historical development shows a clear trend towards more sophisticated approaches.",
      "Ethical considerations include privacy concerns and potential societal impacts."
    ];

    // Create and save reflection entities
    const reflections = await Promise.all(
      mockReflections.map(async (content) => {
        const reflection = new Reflection();
        reflection.content = content;
        const topic = await this.dataSource.getRepository(Topic).findOneOrFail({ where: { id: input.core.topicId }});
        reflection.topic = topic;
        return await this.dataSource.getRepository(Reflection).save(reflection);
      })
    );

    return reflections;
  }
} 