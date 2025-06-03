import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';
import { CompletedQueueSchema } from '../CompletedHandler';

export const handler = createLambdaHandler({
  schema: CompletedQueueSchema,
  handler: async (input, serviceFactory) => {
    const completedHandler = serviceFactory.getCompletedHandler();
    return completedHandler.handleQueueMessage({ entity: input });
  },
}); 