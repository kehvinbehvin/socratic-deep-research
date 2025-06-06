import { APIGatewayProxyEvent, SQSEvent } from 'aws-lambda';
import { initializeDatabase } from '../config/database';
import { ServiceFactory } from '../services/ServiceFactory';
import { LoggerService } from '../services/LoggerService';
import { z } from 'zod';
import { MetricDefinitions } from '../metrics/definitions';

const logger = LoggerService.getInstance();

export interface HandlerConfig<T> {
  handler: (input: T , serviceFactory: ServiceFactory) => Promise<any>;
}

export function createLambdaHandler<T>({ handler }: HandlerConfig<T>): (event: APIGatewayProxyEvent | SQSEvent) => Promise<any> {
  return async (event) => {
    let dataSource;
    const startTime = Date.now();
    let handlerName = handler.name || 'unknown';
    let eventType = 'Records' in event ? 'sqs' : 'api';

    try {
      // Initialize database connection
      dataSource = await initializeDatabase();
      logger.info('Database initialized');

      // Initialize services
      const serviceFactory = await ServiceFactory.initialize(dataSource);
      logger.info('Services initialized');

      // Initialize usage tracking
      const metrics = serviceFactory.getCentralizedMetrics();
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

      // Initialize database and services
      const dataSource = await initializeDatabase();
      const serviceFactory = await ServiceFactory.initialize(dataSource);

      const metrics = serviceFactory.getCentralizedMetrics();
      if (metrics) {
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
      }

      await ServiceFactory.close();

      if (dataSource) {
        await dataSource.destroy();
      }

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

