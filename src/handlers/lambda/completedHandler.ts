import { ServiceFactory } from "../../services/ServiceFactory";
import { createLambdaHandler } from "../../utils/lambda";


export const handler = createLambdaHandler({
  handler: async (input , serviceFactory: ServiceFactory) => {
    const completedHandler = serviceFactory.getCompletedHandler();
    return completedHandler.handleQueueMessage(input);
  },
}); 