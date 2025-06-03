import { LoggerService } from './services/LoggerService';
import { startWebServer } from './web/server';

const logger = LoggerService.getInstance();

// Start the web application
async function startApplication() {
  try {
    await startWebServer(3000);
    logger.info('Application startup complete', {
      nodeEnv: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info'
    });
  } catch (error) {
    logger.error('Application startup error', { 
      error: error instanceof Error ? error.stack : String(error)
    });
    process.exit(1);
  }
}

// Only start the application if we're not in Lambda
if (process.env.AWS_LAMBDA_FUNCTION_NAME === undefined) {
  startApplication().catch(error => {
    logger.error('Fatal error', {
      error: error instanceof Error ? error.stack : String(error)
    });
    process.exit(1);
  });
} 