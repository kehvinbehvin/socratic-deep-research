import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';
import { ProcessingStatus } from '../../entities/BaseEntity';

// Question request schema
export const QuestionRequestSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(), 
  status: z.nativeEnum(ProcessingStatus),
  topicId: z.string().uuid(),
  questionId: z.string().uuid(),
});

export const handler = createLambdaHandler({
  schema: QuestionRequestSchema,
  handler: async (input, serviceFactory) => {
    const questionHandler = serviceFactory.getQuestionHandler();
    return questionHandler.handleRequest(input || { content: '', id: '', topicId: '' });
  },
}); 