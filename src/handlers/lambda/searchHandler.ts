import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';

// Search request schema
const SearchRequestSchema = z.object({
  queryPreparationId: z.string().uuid(),
});

export const handler = createLambdaHandler({
  schema: SearchRequestSchema,
  handler: async (input, serviceFactory) => {
    const searchHandler = serviceFactory.getSearchHandler();
    return searchHandler.handleRequest(input);
  },
}); 