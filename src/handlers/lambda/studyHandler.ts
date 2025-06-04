import { createLambdaHandler } from '../../utils/lambda';
import { ServiceFactory } from '../../services/ServiceFactory';
import { StudyRequest } from '../StudyHandler';

export const handler = createLambdaHandler({
  handler: async (input: StudyRequest, serviceFactory: ServiceFactory) => {
    const studyHandler = serviceFactory.getStudyHandler();
    return studyHandler.handleAPIEvent(input);
  },
}); 