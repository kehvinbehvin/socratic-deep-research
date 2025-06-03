import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';

// Question request schema
const QuestionRequestSchema = z.object({
  questionId: z.string().uuid(),
  topicId: z.string().uuid(),
  content: z.string().min(1),
});

export const handler = createLambdaHandler({
  schema: QuestionRequestSchema,
  handler: async (input, serviceFactory) => {
    const questionHandler = serviceFactory.getQuestionHandler();
    return questionHandler.handleRequest(input);
  },
}); 