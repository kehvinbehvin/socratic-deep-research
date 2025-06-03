import express from 'express';
import { join } from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { SystemMonitor } from '../utils/monitor';
import { LoggerService } from '../services/LoggerService';
import { MonitoringService } from '../services/MonitoringService';
import { ServiceFactory } from '../services/ServiceFactory';
import { initializeDatabase } from '../config/database';
import { QUEUE_NAMES } from '../config/queues';
import { z } from 'zod';
import { Topic } from '../entities/Topic';
import { ProcessingStatus } from '../entities/BaseEntity';
import { Server } from 'http';
import expressLayouts from 'express-ejs-layouts';

const app = express();
const logger = LoggerService.getInstance();
const monitor = new SystemMonitor();
const monitoring = MonitoringService.getInstance();

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// View engine setup
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// WebSocket setup
const server = new Server(app);
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  
  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Broadcast updates to all connected clients
function broadcastUpdate(topic: Topic) {
  const message = JSON.stringify(topic);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/api/topics', async (req, res) => {
  try {
    const serviceFactory = await ServiceFactory.initialize(req.app.locals.dataSource);
    const topics = await serviceFactory.getDataSource()
      .getRepository(Topic)
      .find({
        order: { createdAt: 'DESC' },
        take: 10
      });
    res.json(topics);
  } catch (error) {
    logger.error('Failed to fetch topics', { error });
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

app.post('/api/topics', async (req, res) => {
  try {
    const serviceFactory = await ServiceFactory.initialize(req.app.locals.dataSource);
    const studyHandler = serviceFactory.getStudyHandler();
    const result = await studyHandler.handleRequest(req.body);
    
    // Broadcast the new topic to all connected clients
    broadcastUpdate(result);
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to create topic', { error });
    res.status(error instanceof z.ZodError ? 400 : 500).json({
      error: error instanceof Error ? error.message : 'Failed to create topic'
    });
  }
});

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

  // Get system health and log it
  const systemHealth = monitor.getSystemHealth();
  logger.info('System Health Status', systemHealth);

  res.render('metrics', {
    metrics: queueMetrics,
    health: systemHealth
  });
});

export async function startWebServer(port: number = 5000) {
  try {
    // Initialize database connection
    const dataSource = await initializeDatabase();
    app.locals.dataSource = dataSource;
    logger.info('Database initialized for web server');

    // Initialize services
    const serviceFactory = await ServiceFactory.initialize(dataSource);
    logger.info('Services initialized for web server');

    // Start server
    server.listen(port, () => {
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