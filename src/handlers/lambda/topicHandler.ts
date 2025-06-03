import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';

// Topic request schema
const TopicRequestSchema = z.object({
  topicId: z.string().uuid(),
  content: z.string().min(1),
});

export const handler = createLambdaHandler({
  schema: TopicRequestSchema,
  handler: async (input, serviceFactory) => {
    const topicHandler = serviceFactory.getTopicHandler();
    return topicHandler.handleRequest(input);
  },
}); 