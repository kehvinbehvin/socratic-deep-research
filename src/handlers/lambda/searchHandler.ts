import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';
import { SearchQueueSchema } from '../SearchHandler';

export const handler = createLambdaHandler({
  schema: SearchQueueSchema,
  handler: async (input, serviceFactory) => {
    const searchHandler = serviceFactory.getSearchHandler();
    return searchHandler.handleQueueMessage({ entity: input });
  },
}); 