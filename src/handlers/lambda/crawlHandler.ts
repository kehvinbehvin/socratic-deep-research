import { createLambdaHandler } from '../../utils/lambda';
import { CrawlResultStageData } from '../../types/dtos';
import { GenericQueueDTO } from '../../types/dtos';
import { ServiceFactory } from '../../services/ServiceFactory';

export const handler = createLambdaHandler({
  handler: async (input: GenericQueueDTO<CrawlResultStageData>, serviceFactory: ServiceFactory) => {
    const crawlResultHandler = serviceFactory.getCrawlResultHandler();
    return crawlResultHandler.handleQueueMessage(input);
  },
  handlerName: 'crawlHandler',
}); 