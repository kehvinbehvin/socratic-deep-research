import { BaseHandler } from './BaseHandler';
import { Question } from '../entities/Question';
import { Topic } from '../entities/Topic';
import { QueueService, OpenAIService } from '../services';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { z } from 'zod';
import { ProcessingStatus } from '../entities/BaseEntity';

interface TopicInput {
  topicId: string;
  content: string;
}

const FollowUpQuestionsSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    reasoning: z.string(),
    concepts: z.array(z.string())
  })),
  summary: z.string(),
  suggestedApproach: z.string()
});

type FollowUpQuestion = z.infer<typeof FollowUpQuestionsSchema>['questions'][number];
type FollowUpQuestions = z.infer<typeof FollowUpQuestionsSchema>;

export class TopicHandler extends BaseHandler<TopicInput, Topic> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      Topic,
      QUEUE_NAMES.TOPIC,
      QUEUE_NAMES.QUESTION
    );
    this.openAIService = openAIService;
  }

  // Public method for handling web/API requests
  public async handleRequest(input: TopicInput): Promise<Topic> {
    return this.process(input);
  }

  // Protected method for internal queue processing
  // Topic handler is used to generate follow-up questions for a topic and is triggered when a new topic is pushed into the topic queue 
  // by the study handler
  protected async process(input: TopicInput): Promise<Topic> {
    const question = new Question();
    question.content = input.content;
    question.topicId = input.topicId;
    question.status = ProcessingStatus.PENDING;

    // Get the topic
    const topic = await this.dataSource
      .getRepository(Topic)
      .findOne({ where: { id: input.topicId } });

    if (!topic) {
      throw new Error(`Topic not found: ${input.topicId}`);
    }

    // Generate follow-up questions using OpenAI with structured output
    const prompt = `Given the topic "${topic.content}" and the question "${input.content}",
      generate 2-3 follow-up questions that would help deepen understanding through the Socratic method.
      
      For each question:
      1. The question should be probing and encourage critical thinking
      2. Provide reasoning for why this question is important
      3. List key concepts that the question explores
      
      Also provide:
      1. A brief summary of how these questions relate to the main topic
      2. A suggested approach for exploring these questions`;

    const followUpQuestions = await this.openAIService.generateStructuredOutput(
      prompt,
      FollowUpQuestionsSchema
    );

    // Format the questions for storage
    const formattedQuestions = followUpQuestions.questions
      .map((q: FollowUpQuestion, i: number) => 
        `${i + 1}. ${q.question}\nReasoning: ${q.reasoning}\nConcepts: ${q.concepts.join(', ')}`
      )
      .join('\n\n');

    const fullOutput = `${formattedQuestions}\n\nSummary: ${followUpQuestions.summary}\n\nApproach: ${followUpQuestions.suggestedApproach}`;

    question.topic = topic;
    question.followUpQuestions = fullOutput;

    // Save to database
    const savedQuestion = await this.repository.save(question);

    return savedQuestion;
  }
} 