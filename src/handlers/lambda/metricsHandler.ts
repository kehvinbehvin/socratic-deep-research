import { createLambdaHandler } from '../../utils/lambda';

export const handler = createLambdaHandler({
  handler: async (input, serviceFactory) => {
    const metricService = await serviceFactory.getMetricsService();
    return await metricService.getMetrics();
  },
}); 