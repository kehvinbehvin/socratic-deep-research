import { createResponse } from '../../utils/response';
import { createLambdaHandler } from '../../utils/lambda';
import { z } from 'zod';

export const handler = createLambdaHandler({
  schema: z.object({}),
  handler: async (input, serviceFactory) => {
    const studies = await serviceFactory.getStudyService().getStudies();
    return createResponse(200, studies);
  },
}); 