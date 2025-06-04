import { createLambdaHandler } from '../../utils/lambda';
import { ServiceFactory } from '../../services/ServiceFactory';
import { FireCrawlWebhookRequest } from '../FireCrawlWebhookHandler';

export const handler = createLambdaHandler({
  handler: async (input: FireCrawlWebhookRequest, serviceFactory: ServiceFactory) => {
    const fireCrawlWebhookHandler = serviceFactory.getFireCrawlWebhookHandler();
    return fireCrawlWebhookHandler.handleAPIEvent(input);
  },
}); 