import { APIGatewayProxyHandler } from 'aws-lambda';
import { initializeDatabase } from './database';
import { ServiceFactory } from '../services/ServiceFactory';
import { LoggerService } from '../services/LoggerService';
import { z } from 'zod';

const logger = LoggerService.getInstance();

export interface HandlerConfig<T> {
  schema: z.ZodSchema<T>;
  handler: (input: T, serviceFactory: ServiceFactory) => Promise<any>;
}

export function createLambdaHandler<T>({ schema, handler }: HandlerConfig<T>): APIGatewayProxyHandler {
  return async (event) => {
    let dataSource;
    try {
      // Initialize database connection
      dataSource = await initializeDatabase();
      logger.info('Database initialized');

      // Initialize services
      const serviceFactory = await ServiceFactory.initialize(dataSource);
      logger.info('Services initialized');

      // Parse and validate request body
      const body = event.body ? JSON.parse(event.body) : null;
      const validatedData = schema.parse(body);

      // Process the request
      const result = await handler(validatedData, serviceFactory);

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