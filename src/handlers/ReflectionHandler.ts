import { BaseHandler } from './BaseHandler';
import { Reflection } from '../entities/Reflection';
import { Question } from '../entities/Question';
import { QueueService, OpenAIService } from '../services';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { z } from 'zod';

interface ReflectionInput {
  questionId: string;
  content: string;
}

const ReflectionAnalysisSchema = z.object({
  coreQuestionAnalysis: z.object({
    relevance: z.number().min(0).max(10),
    completeness: z.number().min(0).max(10),
    reasoning: z.string()
  }),
  conceptualUnderstanding: z.array(z.object({
    concept: z.string(),
    understanding: z.enum(['clear', 'partial', 'misconception']),
    explanation: z.string()
  })),
  areasForImprovement: z.array(z.object({
    area: z.string(),
    suggestion: z.string(),
    priority: z.enum(['high', 'medium', 'low'])
  })),
  overallAssessment: z.string()
});

type ReflectionAnalysis = z.infer<typeof ReflectionAnalysisSchema>;

export class ReflectionHandler extends BaseHandler<ReflectionInput, Reflection> {
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
      QUEUE_NAMES.REFLECTION,
      QUEUE_NAMES.CLARIFICATION
    );
    this.openAIService = openAIService;
  }

  protected async process(input: ReflectionInput): Promise<Reflection> {
    const question = await this.dataSource
      .getRepository(Question)
      .findOne({ 
        where: { id: input.questionId },
        relations: ['topic']
      });

    if (!question) {
      throw new Error(`Question not found: ${input.questionId}`);
    }

    const prompt = `Analyze this reflection in the context of Socratic learning:

    Topic: "${question.topic.content}"
    Question: "${question.content}"
    Reflection: "${input.content}"

    Provide a detailed analysis that:
    1. Evaluates how well the reflection addresses the core question
    2. Identifies key concepts and assesses understanding
    3. Suggests specific areas for improvement
    4. Gives an overall assessment of the learning progress`;

    const analysis = await this.openAIService.generateStructuredOutput(
      prompt,
      ReflectionAnalysisSchema
    );

    // Format the analysis for storage
    const formattedAnalysis = [
      `Core Question Analysis:`,
      `- Relevance: ${analysis.coreQuestionAnalysis.relevance}/10`,
      `- Completeness: ${analysis.coreQuestionAnalysis.completeness}/10`,
      `- Reasoning: ${analysis.coreQuestionAnalysis.reasoning}`,
      `\nConceptual Understanding:`,
      ...analysis.conceptualUnderstanding.map(cu => 
        `- ${cu.concept}: ${cu.understanding}\n  ${cu.explanation}`
      ),
      `\nAreas for Improvement:`,
      ...analysis.areasForImprovement.map(ai =>
        `- [${ai.priority.toUpperCase()}] ${ai.area}\n  Suggestion: ${ai.suggestion}`
      ),
      `\nOverall Assessment:`,
      analysis.overallAssessment
    ].join('\n');

    const reflection = new Reflection();
    reflection.question = question;
    reflection.content = input.content;
    reflection.analysis = formattedAnalysis;

    return reflection;
  }
} 