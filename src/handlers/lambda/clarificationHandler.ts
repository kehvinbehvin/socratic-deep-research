import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';

// Clarification request schema
const ClarificationRequestSchema = z.object({
  clarificationId: z.string().uuid(),
  reflectionId: z.string().uuid(),
  content: z.string().min(1),
});

export const handler = createLambdaHandler({
  schema: ClarificationRequestSchema,
  handler: async (input, serviceFactory) => {
    const clarificationHandler = serviceFactory.getClarificationHandler();
    return clarificationHandler.handleRequest(input);
  },
}); 