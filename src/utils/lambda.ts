import { APIGatewayProxyHandler, APIGatewayProxyEvent, SQSEvent } from 'aws-lambda';
import { initializeDatabase } from '../config/database';
import { ServiceFactory } from '../services/ServiceFactory';
import { LoggerService } from '../services/LoggerService';
import { z } from 'zod';

const logger = LoggerService.getInstance();

export interface HandlerConfig<T> {
  handler: (input: T , serviceFactory: ServiceFactory) => Promise<any>;
}

export function createLambdaHandler<T>({ handler }: HandlerConfig<T>): (event: APIGatewayProxyEvent | SQSEvent) => Promise<any> {
  return async (event) => {
    let dataSource;
    try {
      // Initialize database connection
      dataSource = await initializeDatabase();
      logger.info('Database initialized');

      // Initialize services
      const serviceFactory = await ServiceFactory.initialize(dataSource);
      logger.info('Services initialized');

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

      // Clean up
      await dataSource.destroy();

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

