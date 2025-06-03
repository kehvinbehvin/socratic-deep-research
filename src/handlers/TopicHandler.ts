import { QueueHandler } from './QueueHandler';
import { Topic } from '../entities/Topic';
import { Question } from '../entities/Question';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { ProcessingStatus } from '../entities/BaseEntity';
import { QuestionStageData, QueueQuestionDTO, QueueTopicDTO } from '../types/dtos';
import { TopicStageData } from '../types/dtos';

export class TopicHandler extends QueueHandler<TopicStageData, QuestionStageData, Question> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(queueService, dataSource, Topic, 'TOPIC', 'QUESTION');
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(entities: Question[], prevMessage: QueueTopicDTO): Promise<QueueQuestionDTO> {
    return {
      core: {
        ...prevMessage.core,
        updatedAt: new Date()
      },
      previousStages: {
        ...prevMessage.previousStages, // Topic is the first stage, so no previous stages
      },
      currentStage: {
        questions: entities.map(entity => entity.content)
      }
    }
  }

  protected async process(message: QueueTopicDTO): Promise<Question[]> {
    // Get the topic
    const topic = await this.dataSource
      .getRepository(Topic)
      .findOne({
        where: { id: message.core.topicId }
      });

    if (!topic) {
      throw new Error(`Topic not found: ${message.core.topicId}`);
    }

    // TODO: Use LLM to generate questions
    const question = new Question();
    question.topic = topic;
    question.content = "Test Question"
    question.status = ProcessingStatus.COMPLETED;

    await this.dataSource.getRepository(Question).save(question);

    return [question];
  }
} 