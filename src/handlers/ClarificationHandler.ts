import { BaseHandler } from './BaseHandler';
import { Clarification } from '../entities/Clarification';
import { QueryPreparation } from '../entities/QueryPreparation';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { ProcessingStatus } from '../entities/BaseEntity';
import { z } from 'zod';

// Schema for queue messages
export const ClarificationQueueSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  reflectionId: z.string().uuid()
});

export type ClarificationQueueInput = z.infer<typeof ClarificationQueueSchema>;

export class ClarificationHandler extends BaseHandler<ClarificationQueueInput, Clarification> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      Clarification,
      'CLARIFICATION',
      'QUERY_PREPARATION'
    );
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(message: any): Promise<ClarificationQueueInput> {
    // Extract just the fields we need from the queue message
    const { id, content, reflectionId } = message.entity;
    return { id, content, reflectionId };
  }

  protected async process(input: ClarificationQueueInput): Promise<Clarification> {
    const clarification = await this.dataSource
      .getRepository(Clarification)
      .findOne({
        where: { id: input.id },
        relations: ['reflection', 'reflection.question', 'reflection.question.topic']
      });

    if (!clarification) {
      throw new Error(`Clarification not found: ${input.id}`);
    }

    // TODO: Implement OpenAI integration
    // const finalInsight = await this.openAIService.generateText(prompt);
    const finalInsight = `Stub insight for clarification: ${clarification.content}`;

    // Create query preparation entity
    const queryPreparation = new QueryPreparation();
    queryPreparation.clarification = clarification;
    queryPreparation.content = finalInsight;
    queryPreparation.status = ProcessingStatus.PENDING;

    return clarification;
  }
} 