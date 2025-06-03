import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';
import { ClarificationQueueSchema } from '../ClarificationHandler';

export const handler = createLambdaHandler({
  schema: ClarificationQueueSchema,
  handler: async (input, serviceFactory) => {
    const clarificationHandler = serviceFactory.getClarificationHandler();
    return clarificationHandler.handleQueueMessage({ entity: input });
  },
}); 