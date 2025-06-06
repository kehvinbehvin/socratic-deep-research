import { createLambdaHandler } from '../../utils/lambda';
import { GenericQueueDTO } from '../../types/dtos';
import { ServiceFactory } from '../../services/ServiceFactory';
import { SearchResultStageData } from '../../types/dtos';

export const handler = createLambdaHandler({
  handler: async (input: GenericQueueDTO<SearchResultStageData>, serviceFactory: ServiceFactory) => {
    const searchHandler = serviceFactory.getSearchHandler();
    return searchHandler.handleQueueMessage(input);
  },
  handlerName: 'searchHandler',
}); 