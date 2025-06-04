import { createLambdaHandler } from '../../utils/lambda';
import { ReviewStageData } from '../../types/dtos';
import { GenericQueueDTO } from '../../types/dtos';
import { ServiceFactory } from '../../services/ServiceFactory';

export const handler = createLambdaHandler({
  handler: async (input: GenericQueueDTO<ReviewStageData>, serviceFactory: ServiceFactory) => {
    const reviewHandler = serviceFactory.getReviewHandler();
    return reviewHandler.handleQueueMessage(input);
  },
}); 