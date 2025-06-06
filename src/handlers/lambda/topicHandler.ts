import { createLambdaHandler } from '../../utils/lambda';
import { GenericQueueDTO } from '../../types/dtos';
import { TopicStageData } from '../../types/dtos';
import { ServiceFactory } from '../../services/ServiceFactory';

export const handler = createLambdaHandler({
  handler: async (input: GenericQueueDTO<TopicStageData>, serviceFactory: ServiceFactory) => {
    const topicHandler = serviceFactory.getTopicHandler();
    return topicHandler.handleQueueMessage(input);
  },
  handlerName: 'topicHandler',
}); 