import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';

// Crawl request schema
const CompletedRequestSchema = z.object({
  reviewResultId: z.string().uuid(),
});

export const handler = createLambdaHandler({
  schema: CompletedRequestSchema,
  handler: async (input, serviceFactory) => {
    const completedHandler = serviceFactory.getCompletedHandler();
    return completedHandler.handleRequest(input);
  },
}); 