import { createLambdaHandler } from '../../utils/lambda';
import { GenericQueueDTO } from '../../types/dtos';
import { ServiceFactory } from '../../services/ServiceFactory';
import { ClarificationStageData } from '../../types/dtos';

export const handler = createLambdaHandler({
  handler: async (input: GenericQueueDTO<ClarificationStageData>, serviceFactory: ServiceFactory) => {
    const clarificationHandler = serviceFactory.getClarificationHandler();
    return clarificationHandler.handleQueueMessage(input);
  },
  handlerName: 'clarificationHandler',
}); 