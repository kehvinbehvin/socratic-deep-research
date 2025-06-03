import { createLambdaHandler } from '../../utils/lambda';
import { GenericQueueDTO } from '../../types/dtos';
import { ServiceFactory } from '../../services/ServiceFactory';
import { ReflectionStageData } from '../../types/dtos';

export const handler = createLambdaHandler({
  handler: async (input: GenericQueueDTO<ReflectionStageData>, serviceFactory: ServiceFactory) => {
    const reflectionHandler = serviceFactory.getReflectionHandler();
    return reflectionHandler.handleQueueMessage(input);
  },
}); 