import { DataSource } from "typeorm";
import { QueueService } from "../services/QueueService";
import { QueueHandler } from "./QueueHandler";
import { CompleteStageData, GenericQueueDTO } from "../types/dtos";
import { ProcessingStatus } from "../entities/BaseEntity";
import { Topic } from "../entities/Topic";

export class CompletedHandler extends QueueHandler<CompleteStageData, void, Topic> {
  constructor(
    queueService: QueueService,
    dataSource: DataSource
  ) {
    super(queueService, dataSource, Topic, 'COMPLETE', undefined); // No target queue
  }

  protected async process(message: GenericQueueDTO<CompleteStageData>): Promise<Topic[]> {
    // Perform terminal side effects — like cleanup, notifications, audit logging
    const entity = await this.dataSource.getRepository(Topic).findOneBy({ id: message.core.id });

    if (!entity) throw new Error("Entity not found");

    // E.g. mark as done
    entity.status = ProcessingStatus.COMPLETED;
    await this.dataSource.getRepository(Topic).save(entity);

    return [];
  }

  protected async transformQueueMessage(
    entities: Topic[],
    prevMessage: GenericQueueDTO<CompleteStageData>
  ): Promise<GenericQueueDTO<void>> {
    return null as any;
  }
}
