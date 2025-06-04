import { ServiceFactory } from "../../services/ServiceFactory";
import { GenericQueueDTO } from "../../types/dtos";
import { CompleteStageData } from "../../types/dtos";
import { createLambdaHandler } from "../../utils/lambda";

export const handler = createLambdaHandler({
  handler: async (input: GenericQueueDTO<CompleteStageData>, serviceFactory: ServiceFactory) => {
    const completedHandler = serviceFactory.getCompletedHandler();
    return completedHandler.handleQueueMessage(input);
  },
}); 