import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';
import { ProcessingStatus } from '../../entities/BaseEntity';
import { QuestionRequestSchema } from './questionHandler';
import { Topic } from '../../entities/Topic';

// Topic request schema
const TopicRequestSchema: z.ZodSchema<Topic> = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.nativeEnum(ProcessingStatus),
  questions: z.array(QuestionRequestSchema),
})

export const handler = createLambdaHandler({
  schema: TopicRequestSchema,
  handler: async (input, serviceFactory) => {
    const topicHandler = serviceFactory.getTopicHandler();
    return topicHandler.handleRequest(input);
  },
}); 