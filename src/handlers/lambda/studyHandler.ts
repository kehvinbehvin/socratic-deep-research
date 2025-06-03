import { z } from 'zod';
import { createLambdaHandler } from '../../utils/lambda';

// Topic request schema
const StudyRequestSchema = z.object({
  content: z.string().min(1),
});

export const handler = createLambdaHandler({
  schema: StudyRequestSchema,
  handler: async (input, serviceFactory) => {
    const studyHandler = serviceFactory.getStudyHandler();
    return studyHandler.handleRequest(input);
  },
}); 