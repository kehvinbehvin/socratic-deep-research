import { GenericQueueDTO } from '../../types/dtos';
import { ServiceFactory } from '../../services/ServiceFactory';
import { QuestionStageData } from '../../types/dtos';
import { createLambdaHandler } from '../../utils/lambda';

export const handler = createLambdaHandler({
  handler: async (input: GenericQueueDTO<QuestionStageData>, serviceFactory: ServiceFactory) => {
    const questionHandler = serviceFactory.getQuestionHandler();
    return questionHandler.handleQueueMessage(input);
  },
}); 