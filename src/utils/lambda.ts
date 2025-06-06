import { APIGatewayProxyEvent, SQSEvent } from 'aws-lambda';
import { initializeDatabase } from '../config/database';
import { ServiceFactory } from '../services/ServiceFactory';
import { z } from 'zod';
import { MetricDefinitions } from '../metrics/definitions';

export interface HandlerConfig<T> {
  handler: (input: T , serviceFactory: ServiceFactory) => Promise<any>;
  handlerName: string;
}

export function createLambdaHandler<T>({ handler, handlerName }: HandlerConfig<T>): (event: APIGatewayProxyEvent | SQSEvent) => Promise<any> {
  return async (event) => {
    const startTime = Date.now();
    let eventType = 'Records' in event ? 'sqs' : 'api';

    // Initialize database connection
    const dataSource = await initializeDatabase();
    const serviceFactory = await ServiceFactory.initialize(dataSource);
    const logger = serviceFactory.getLoggerService();
    const metrics = serviceFactory.getCentralizedMetrics();

    // If these services are not initialized, we wont proceed
    if (!dataSource || !serviceFactory || !logger || !metrics) {
      logger.error('Services not initialized');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Services not initialized' }),
      };
    }

    try {
      // Record invocation
      metrics.observe(MetricDefinitions.lambda.invocations, 1, {
        handler: handlerName,
        type: eventType
      });

      // Check for SQS event or API Gateway event
      let input;
      if ('Records' in event) {
          // SQS event
          const sqsEvent = event as SQSEvent;
          const records = sqsEvent.Records;
          if (records && records.length > 0) {
              input = JSON.parse(records[0].body);
          } else {
              input = {};
          }
          logger.info('SQS event body: ' + JSON.stringify(input));
      } else {
          // API Gateway event
          const apiEvent = event as APIGatewayProxyEvent;
          input = apiEvent.body ? JSON.parse(apiEvent.body) : {};
          logger.info('API Gateway body: ' + JSON.stringify(input));
      }
      // Process the request
      console.log('Processing input', input);
      const result = await handler(input, serviceFactory);
      logger.info('Result', { content_size: JSON.stringify(result).length });

      // Record duration and success
      const duration = Date.now() - startTime;
      metrics.observe(MetricDefinitions.lambda.duration, duration / 1000, {
        handler: handlerName,
        type: eventType,
        status: 'success'
      });

      metrics.observe(MetricDefinitions.lambda.success, 1, {
        handler: handlerName,
        type: eventType
      });

      await ServiceFactory.close();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      };
    } catch (error) {
      logger.error('Lambda handler error', {
        error: error instanceof Error ? error.stack : String(error),
      });

      const duration = Date.now() - startTime;

      // Record duration
      metrics.observe(MetricDefinitions.lambda.duration, duration / 1000, {
          handler: handlerName,
          type: eventType,
          status: 'error'
      });

      // Record errors
      metrics.observe(MetricDefinitions.lambda.errors, 1, {
        handler: handlerName,
        type: eventType,
        error_type: error instanceof z.ZodError ? 'validation' : 'internal'
      });

      await ServiceFactory.close();

      return {
        statusCode: error instanceof z.ZodError ? 400 : 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: error instanceof Error ? error.message : 'Internal server error',
        }),
      };
    }
  };
} 

