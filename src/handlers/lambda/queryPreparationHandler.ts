import { createLambdaHandler } from '../../utils/lambda';
import { GenericQueueDTO } from '../../types/dtos';
import { ServiceFactory } from '../../services/ServiceFactory';
import { QueryPreparationStageData } from '../../types/dtos';

export const handler = createLambdaHandler({
  handler: async (input: GenericQueueDTO<QueryPreparationStageData>, serviceFactory: ServiceFactory) => {
    const queryPreparationHandler = serviceFactory.getQueryPreparationHandler();
    return queryPreparationHandler.handleQueueMessage(input);
  },
}); 