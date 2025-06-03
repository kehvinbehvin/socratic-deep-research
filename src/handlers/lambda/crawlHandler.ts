import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';

// Crawl request schema
const CrawlRequestSchema = z.object({
  searchResultId: z.string().uuid(),
});

export const handler = createLambdaHandler({
  schema: CrawlRequestSchema,
  handler: async (input, serviceFactory) => {
    const crawlHandler = serviceFactory.getCrawlHandler();
    return crawlHandler.handleRequest(input);
  },
}); 