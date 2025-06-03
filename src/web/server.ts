import express from 'express';
import { join } from 'path';
import { SystemMonitor } from '../utils/monitor';
import { LoggerService } from '../services/LoggerService';
import { MonitoringService } from '../services/MonitoringService';
import { QUEUE_NAMES } from '../config/queues';

const app = express();
const logger = LoggerService.getInstance();
const monitor = new SystemMonitor();
const monitoring = MonitoringService.getInstance();

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  const summary = monitoring.getMetricsSummary();
  const health = {
    status: 'unknown',
    queues: {} as Record<string, any>
  };

  for (const queueName of Object.values(QUEUE_NAMES)) {
    health.queues[queueName] = {
      length: summary[`queue_length`]?.avg || 0,
      processingTime: summary[`${queueName}_processing_duration_ms`]?.avg || 0,
      successRate: calculateSuccessRate(queueName, summary),
      errorCount: summary[`error_count`]?.count || 0
    };
  }

  res.render('dashboard', { health });
});

app.get('/queue/:name', (req, res) => {
  const queueName = req.params.name;
  const metrics = {
    messages: monitoring.getMetrics(`queue_length`).filter(m => m.tags?.queue === queueName),
    processing: monitoring.getMetrics(`${queueName}_processing_duration_ms`),
    success: monitoring.getMetrics(`${queueName}_success`),
    errors: monitoring.getMetrics('error_count').filter(m => m.tags?.category === queueName)
  };

  res.render('queue', { queueName, metrics });
});

app.get('/api/metrics', (req, res) => {
  const summary = monitoring.getMetricsSummary();
  res.json(summary);
});

app.get('/api/queue/:name', (req, res) => {
  const queueName = req.params.name;
  const metrics = {
    messages: monitoring.getMetrics(`queue_length`).filter(m => m.tags?.queue === queueName),
    processing: monitoring.getMetrics(`${queueName}_processing_duration_ms`),
    success: monitoring.getMetrics(`${queueName}_success`),
    errors: monitoring.getMetrics('error_count').filter(m => m.tags?.category === queueName)
  };
  res.json(metrics);
});

function calculateSuccessRate(queueName: string, summary: Record<string, any>): number {
  const successCount = summary[`${queueName}_success`]?.count || 0;
  const errorCount = summary[`error_count`]?.count || 0;
  const total = successCount + errorCount;
  return total > 0 ? (successCount / total) * 100 : 100;
}

export function startWebServer(port: number = 3000): void {
  app.listen(port, () => {
    logger.info(`Metrics web interface listening on port ${port}`);
  });
} 