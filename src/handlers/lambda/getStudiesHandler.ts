import { createResponse } from '../../utils/response';
import { createLambdaHandler } from '../../utils/lambda';
import { z } from 'zod';

export const handler = createLambdaHandler({
  schema: undefined, 
  handler: async (input, serviceFactory) => {
    const studies = await serviceFactory.getStudyService();
    return await studies.getStudies()
  },
}); 