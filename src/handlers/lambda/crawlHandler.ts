import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';
import { CrawlQueueSchema } from '../CrawlHandler';

export const handler = createLambdaHandler({
  schema: CrawlQueueSchema,
  handler: async (input, serviceFactory) => {
    const crawlHandler = serviceFactory.getCrawlHandler();
    return crawlHandler.handleQueueMessage({ entity: input });
  },
}); 