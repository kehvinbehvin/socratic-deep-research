import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';
import { QueryPreparationQueueSchema } from '../QueryPreparationHandler';

export const handler = createLambdaHandler({
  schema: QueryPreparationQueueSchema,
  handler: async (input, serviceFactory) => {
    const queryPreparationHandler = serviceFactory.getQueryPreparationHandler();
    return queryPreparationHandler.handleQueueMessage({ entity: input });
  },
}); 