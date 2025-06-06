import { createLambdaHandler } from '../../utils/lambda';

export const handler = createLambdaHandler({
  handler: async (input, serviceFactory) => {
    const studies = await serviceFactory.getStudyService();
    return await studies.getStudies()
  },
  handlerName: 'getStudiesHandler',
}); 