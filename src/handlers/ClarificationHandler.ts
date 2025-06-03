import { BaseHandler } from './BaseHandler';
import { Clarification } from '../entities/Clarification';
import { Reflection } from '../entities/Reflection';
import { QueueService, OpenAIService } from '../services';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { z } from 'zod';

interface ClarificationInput {
  reflectionId: string;
}

const ClarificationOutputSchema = z.object({
  clarifyingQuestions: z.array(z.object({
    question: z.string(),
    purpose: z.string(),
    expectedInsights: z.array(z.string())
  })),
  learningResources: z.array(z.object({
    type: z.enum(['book', 'article', 'video', 'exercise', 'other']),
    title: z.string(),
    description: z.string(),
    relevance: z.string()
  })),
  practicalApplications: z.array(z.object({
    scenario: z.string(),
    steps: z.array(z.string()),
    learningOutcome: z.string()
  })),
  conceptMap: z.array(z.object({
    concept: z.string(),
    relatedConcepts: z.array(z.string()),
    relationship: z.string()
  }))
});

type ClarificationOutput = z.infer<typeof ClarificationOutputSchema>;

export class ClarificationHandler extends BaseHandler<ClarificationInput, Clarification> {
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
      QUEUE_NAMES.CLARIFICATION,
      QUEUE_NAMES.QUERY_PREPARATION
    );
    this.openAIService = openAIService;
  }

  protected async process(input: ClarificationInput): Promise<Clarification> {
    const reflection = await this.dataSource
      .getRepository(Reflection)
      .findOne({
        where: { id: input.reflectionId },
        relations: ['question', 'question.topic']
      });

    if (!reflection) {
      throw new Error(`Reflection not found: ${input.reflectionId}`);
    }

    const prompt = `Based on this learning context, provide structured guidance:

    Topic: "${reflection.question.topic.content}"
    Question: "${reflection.question.content}"
    Reflection: "${reflection.content}"
    Analysis: "${reflection.analysis}"

    Create a comprehensive learning plan that includes:
    1. Clarifying questions to deepen understanding
    2. Relevant learning resources and materials
    3. Practical applications and exercises
    4. A concept map showing relationships between key ideas`;

    const output = await this.openAIService.generateStructuredOutput(
      prompt,
      ClarificationOutputSchema
    );

    // Format clarifying questions
    const formattedQuestions = output.clarifyingQuestions
      .map((q, i) => [
        `${i + 1}. ${q.question}`,
        `   Purpose: ${q.purpose}`,
        `   Expected Insights:`,
        ...q.expectedInsights.map(insight => `   - ${insight}`)
      ].join('\n'))
      .join('\n\n');

    // Format suggestions
    const formattedSuggestions = [
      'Learning Resources:',
      ...output.learningResources.map(r => 
        `- [${r.type.toUpperCase()}] ${r.title}\n  ${r.description}\n  Relevance: ${r.relevance}`
      ),
      '\nPractical Applications:',
      ...output.practicalApplications.map(p => [
        `- Scenario: ${p.scenario}`,
        '  Steps:',
        ...p.steps.map(step => `  - ${step}`),
        `  Outcome: ${p.learningOutcome}`
      ].join('\n')),
      '\nConcept Relationships:',
      ...output.conceptMap.map(c =>
        `- ${c.concept} relates to: ${c.relatedConcepts.join(', ')}\n  ${c.relationship}`
      )
    ].join('\n');

    const clarification = new Clarification();
    clarification.reflection = reflection;
    clarification.clarifyingQuestions = formattedQuestions;
    clarification.suggestions = formattedSuggestions;

    return clarification;
  }
} 