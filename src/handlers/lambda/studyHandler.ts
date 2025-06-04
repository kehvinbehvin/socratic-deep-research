import { createLambdaHandler } from '../../utils/lambda';


export const handler = createLambdaHandler({
  handler: async (input, serviceFactory) => {
    const studyHandler = serviceFactory.getStudyHandler();
    return studyHandler.handleAPIEvent(input);
  },
}); 