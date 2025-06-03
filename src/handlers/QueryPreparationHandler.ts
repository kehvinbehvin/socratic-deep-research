import { BaseHandler } from './BaseHandler';
import { QueryPreparation } from '../entities/QueryPreparation';
import { Clarification } from '../entities/Clarification';
import { QueueService, OpenAIService } from '../services';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '../config/queues';
import { z } from 'zod';

interface QueryPreparationInput {
  clarificationId: string;
}

const QueryPreparationSchema = z.object({
  queryPlan: z.object({
    mainQuery: z.string(),
    subQueries: z.array(z.object({
      query: z.string(),
      purpose: z.string(),
      expectedFindings: z.array(z.string())
    }))
  }),
  researchApproach: z.object({
    methodology: z.string(),
    dataCollectionMethods: z.array(z.string()),
    analysisFramework: z.string()
  }),
  evaluationCriteria: z.array(z.object({
    criterion: z.string(),
    metrics: z.array(z.string()),
    successIndicators: z.array(z.string())
  })),
  timeline: z.array(z.object({
    phase: z.string(),
    duration: z.string(),
    deliverables: z.array(z.string()),
    dependencies: z.array(z.string())
  }))
});

type QueryPreparationOutput = z.infer<typeof QueryPreparationSchema>;

export class QueryPreparationHandler extends BaseHandler<QueryPreparationInput, QueryPreparation> {
  private openAIService: OpenAIService;

  constructor(
    queueService: QueueService,
    dataSource: DataSource,
    openAIService: OpenAIService
  ) {
    super(
      queueService,
      dataSource,
      QueryPreparation,
      QUEUE_NAMES.QUERY_PREPARATION,
      undefined
    );
    this.openAIService = openAIService;
  }

  protected async process(input: QueryPreparationInput): Promise<QueryPreparation> {
    const clarification = await this.dataSource
      .getRepository(Clarification)
      .findOne({
        where: { id: input.clarificationId },
        relations: ['reflection', 'reflection.question', 'reflection.question.topic']
      });

    if (!clarification) {
      throw new Error(`Clarification not found: ${input.clarificationId}`);
    }

    const prompt = `Based on this learning journey, create a structured research plan:

    Topic: "${clarification.reflection.question.topic.content}"
    Original Question: "${clarification.reflection.question.content}"
    Reflection: "${clarification.reflection.content}"
    Analysis: "${clarification.reflection.analysis}"
    Clarifying Questions: "${clarification.clarifyingQuestions}"
    Suggestions: "${clarification.suggestions}"

    Create a comprehensive query preparation plan that includes:
    1. Main query and sub-queries with their purposes
    2. Research methodology and approach
    3. Evaluation criteria and metrics
    4. Timeline and deliverables`;

    const output = await this.openAIService.generateStructuredOutput(
      prompt,
      QueryPreparationSchema
    );

    // Format query plan
    const formattedPlan = [
      'Query Plan:',
      `Main Query: ${output.queryPlan.mainQuery}`,
      '\nSub-Queries:',
      ...output.queryPlan.subQueries.map((sq, i) => [
        `${i + 1}. ${sq.query}`,
        `   Purpose: ${sq.purpose}`,
        '   Expected Findings:',
        ...sq.expectedFindings.map(finding => `   - ${finding}`)
      ].join('\n')),
      '\nResearch Approach:',
      `Methodology: ${output.researchApproach.methodology}`,
      'Data Collection Methods:',
      ...output.researchApproach.dataCollectionMethods.map(method => `- ${method}`),
      `Analysis Framework: ${output.researchApproach.analysisFramework}`,
      '\nEvaluation Criteria:',
      ...output.evaluationCriteria.map(ec => [
        `- ${ec.criterion}`,
        '  Metrics:',
        ...ec.metrics.map(metric => `  - ${metric}`),
        '  Success Indicators:',
        ...ec.successIndicators.map(indicator => `  - ${indicator}`)
      ].join('\n')),
      '\nTimeline:',
      ...output.timeline.map(t => [
        `Phase: ${t.phase}`,
        `Duration: ${t.duration}`,
        'Deliverables:',
        ...t.deliverables.map(d => `- ${d}`),
        'Dependencies:',
        ...t.dependencies.map(d => `- ${d}`)
      ].join('\n'))
    ].join('\n');

    const queryPreparation = new QueryPreparation();
    queryPreparation.clarification = clarification;
    queryPreparation.searchQueries = output.queryPlan.mainQuery + '\n' + 
      output.queryPlan.subQueries.map(sq => sq.query).join('\n');
    queryPreparation.keywords = [
      ...output.queryPlan.subQueries.flatMap(sq => sq.expectedFindings),
      ...output.researchApproach.dataCollectionMethods,
      ...output.evaluationCriteria.flatMap(ec => ec.metrics)
    ].join(', ');

    return queryPreparation;
  }
} 