import express from 'express';
import { join } from 'path';
import { SystemMonitor } from '../utils/monitor';
import { LoggerService } from '../services/LoggerService';
import { MonitoringService } from '../services/MonitoringService';
import { ServiceFactory } from '../services/ServiceFactory';
import { initializeDatabase } from '../utils/database';
import { QUEUE_NAMES } from '../config/queues';
import { z } from 'zod';

const app = express();
const logger = LoggerService.getInstance();
const monitor = new SystemMonitor();
const monitoring = MonitoringService.getInstance();

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Metrics dashboard
app.get('/metrics', (req, res) => {
  const now = Date.now();
  const startTime = now - 24 * 60 * 60 * 1000; // 24 hours ago
  
  // Get metrics for all queues
  const queueMetrics = Object.values(QUEUE_NAMES).reduce((acc: Record<string, any>, queueName) => {
    acc[`queue_${queueName}`] = monitoring.getMetrics(`queue_length`, startTime);
    acc[`processing_${queueName}`] = monitoring.getMetrics(`${queueName}_processing_duration_ms`, startTime);
    return acc;
  }, {});

  res.render('metrics', {
    metrics: queueMetrics,
    health: monitor.getSystemHealth()
  });
});

// Topic request schema
const TopicRequestSchema = z.object({
  content: z.string().min(1),
});

export async function startWebServer(port: number = 3000) {
  try {
    // Initialize database connection
    const dataSource = await initializeDatabase();
    logger.info('Database initialized for web server');

    // Initialize services
    const serviceFactory = await ServiceFactory.initialize(dataSource);
    logger.info('Services initialized for web server');

    // API Routes
    app.post('/api/topics', async (req, res) => {
      try {
        const validatedData = TopicRequestSchema.parse(req.body);
        const studyHandler = serviceFactory.getStudyHandler();
        const result = await studyHandler.handleRequest(validatedData);
        res.json(result);
      } catch (error) {
        logger.error('Error processing topic request', {
          error: error instanceof Error ? error.stack : String(error),
        });
        res.status(error instanceof z.ZodError ? 400 : 500).json({
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    });

    // Start server
    app.listen(port, () => {
      logger.info(`Web server listening on port ${port}`);
    });

    // Monitor system health
    setInterval(() => {
      monitor.getSystemHealth();
    }, 60000); // Every minute

    setInterval(() => {
      monitor.getQueueMetrics();
    }, 300000); // Every 5 minutes

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

  } catch (error) {
    logger.error('Web server startup error', {
      error: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
} 