import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';
import { ProcessingStatus } from '../../entities/BaseEntity';

// Topic request schema for the API/Lambda
const TopicRequestSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.nativeEnum(ProcessingStatus)
});

export const handler = createLambdaHandler({
  schema: TopicRequestSchema,
  handler: async (input, serviceFactory) => {
    const topicHandler = serviceFactory.getTopicHandler();
    return topicHandler.handleQueueMessage({ entity: input });
  },
}); 