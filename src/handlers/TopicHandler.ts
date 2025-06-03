import { BaseHandler } from './BaseHandler';
import { Topic } from '../entities/Topic';
import { Question } from '../entities/Question';
import { QueueService } from '../services/QueueService';
import { OpenAIService } from '../services/OpenAIService';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { ProcessingStatus } from '../entities/BaseEntity';
import { z } from 'zod';

// Schema for API requests
export const CreateTopicSchema = z.object({
  content: z.string().min(1)
});

// Schema for queue messages
export const TopicQueueSchema = z.object({
  id: z.string().uuid(),
  content: z.string()
});

export type CreateTopicInput = z.infer<typeof CreateTopicSchema>;
export type TopicQueueInput = z.infer<typeof TopicQueueSchema>;

// Union type for all possible inputs
export type TopicInput = CreateTopicInput | TopicQueueInput;

export class TopicHandler extends BaseHandler<TopicQueueInput, Topic> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(queueService, dataSource, Topic, 'TOPIC', 'QUESTION');
    this.openAIService = openAIService;
  }

  protected async transformQueueMessage(message: any): Promise<TopicQueueInput> {
    // Extract just the fields we need from the queue message
    const { id, content } = message.entity;
    return { id, content };
  }

  protected async process(input: TopicQueueInput): Promise<Topic> {
    // Get the topic
    const topic = await this.dataSource
      .getRepository(Topic)
      .findOne({
        where: { id: input.id }
      });

    if (!topic) {
      throw new Error(`Topic not found: ${input.id}`);
    }

    // Generate questions using OpenAI
    const prompt = `Given the topic "${topic.content}", generate 2-3 follow-up questions that would help deepen understanding through the Socratic method.`;
    const questions = await this.openAIService.generateQuestions(prompt);

    // Create question entities
    const questionEntities = await Promise.all(
      questions.map(async (questionText) => {
        const question = new Question();
        question.content = questionText;
        question.topic = topic;
        question.status = ProcessingStatus.PENDING;
        return this.dataSource.getRepository(Question).save(question);
      })
    );

    // Update topic with questions
    topic.questions = questionEntities;
    topic.status = ProcessingStatus.COMPLETED;

    // Save and return the updated topic
    return this.dataSource.getRepository(Topic).save(topic);
  }
} 