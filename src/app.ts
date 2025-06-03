import { initializeDatabase } from './utils/database';
import { ServiceFactory } from './services/ServiceFactory';

async function startApplication() {
  try {
    // Initialize database connection
    const dataSource = await initializeDatabase();
    console.log('Database initialized');

    // Initialize services
    const serviceFactory = await ServiceFactory.initialize(dataSource);
    console.log('Services initialized');

    // Start handlers
    const topicHandler = serviceFactory.getTopicHandler();
    topicHandler.start().catch(error => {
      console.error('Topic handler error:', error);
      process.exit(1);
    });

    console.log('Handlers started');

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM signal');
      await dataSource.destroy();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('Received SIGINT signal');
      await dataSource.destroy();
      process.exit(0);
    });
  } catch (error) {
    console.error('Application startup error:', error);
    process.exit(1);
  }
}

startApplication().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 