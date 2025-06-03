import { createLambdaHandler } from '../../utils/lambda';

export const handler = createLambdaHandler({
  schema: undefined, 
  handler: async (input, serviceFactory) => {
    const metricService = await serviceFactory.getMetricsService();
    return await metricService.getMetrics();
  },
}); 