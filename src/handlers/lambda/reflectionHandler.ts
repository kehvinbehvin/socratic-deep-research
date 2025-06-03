import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';
import { ReflectionQueueSchema } from '../ReflectionHandler';

export const handler = createLambdaHandler({
  schema: ReflectionQueueSchema,
  handler: async (input, serviceFactory) => {
    const reflectionHandler = serviceFactory.getReflectionHandler();
    return reflectionHandler.handleQueueMessage({ entity: input });
  },
}); 