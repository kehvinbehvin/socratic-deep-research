import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';

// Query preparation request schema
const QueryPreparationRequestSchema = z.object({
  clarificationId: z.string().uuid(),
});

export const handler = createLambdaHandler({
  schema: QueryPreparationRequestSchema,
  handler: async (input, serviceFactory) => {
    const queryPreparationHandler = serviceFactory.getQueryPreparationHandler();
    return queryPreparationHandler.handleRequest(input);
  },
}); 