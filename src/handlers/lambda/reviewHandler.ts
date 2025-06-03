import { createLambdaHandler } from '../../utils/lambda';
import { ReviewRequestSchema } from '../../types/requests';

export const handler = createLambdaHandler({
  schema: ReviewRequestSchema,
  handler: async (input, serviceFactory) => {
    const reviewHandler = serviceFactory.getReviewHandler();
    return reviewHandler.handleRequest(input);
  },
}); 