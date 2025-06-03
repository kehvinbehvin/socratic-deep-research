import { initializeDatabase } from './utils/database';
import { ServiceFactory } from './services/ServiceFactory';
import { LoggerService } from './services/LoggerService';
import { SystemMonitor } from './utils/monitor';
import { startWebServer } from './web/server';

const logger = LoggerService.getInstance();
const monitor = new SystemMonitor();

// Monitor system health periodically
function startHealthMonitoring(): void {
  setInterval(() => {
    monitor.getSystemHealth();
  }, 60000); // Every minute

  setInterval(() => {
    monitor.getQueueMetrics();
  }, 300000); // Every 5 minutes
}

async function startApplication() {
  try {
    // Initialize database connection
    const dataSource = await initializeDatabase();
    logger.info('Database initialized');

    // Initialize services
    const serviceFactory = await ServiceFactory.initialize(dataSource);
    logger.info('Services initialized');

    // Start handlers
    const topicHandler = serviceFactory.getTopicHandler();
    topicHandler.start().catch(error => {
      logger.error('Topic handler error', { error: error instanceof Error ? error.stack : String(error) });
      process.exit(1);
    });

    logger.info('Handlers started');

    // Start web server
    startWebServer(3000);
    logger.info('Web server started on port 3000');

    // Start monitoring
    startHealthMonitoring();
    logger.info('Monitoring started');

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM signal');
      await dataSource.destroy();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT signal');
      await dataSource.destroy();
      process.exit(0);
    });

    // Log startup complete
    logger.info('Application startup complete', {
      nodeEnv: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      monitoringLevel: process.env.MONITORING_LEVEL || 'info'
    });
  } catch (error) {
    logger.error('Application startup error', { 
      error: error instanceof Error ? error.stack : String(error)
    });
    process.exit(1);
  }
}

startApplication().catch(error => {
  logger.error('Fatal error', {
    error: error instanceof Error ? error.stack : String(error)
  });
  process.exit(1);
}); 