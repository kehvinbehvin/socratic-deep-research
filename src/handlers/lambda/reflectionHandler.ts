import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';

// Reflection request schema
const ReflectionRequestSchema = z.object({
  questionId: z.string().uuid(),
  content: z.string().min(1),
});

export const handler = createLambdaHandler({
  schema: ReflectionRequestSchema,
  handler: async (input, serviceFactory) => {
    const reflectionHandler = serviceFactory.getReflectionHandler();
    return reflectionHandler.handleRequest(input);
  },
}); 