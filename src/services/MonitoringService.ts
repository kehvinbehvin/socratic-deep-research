import pino from 'pino';
import { join } from 'path';

export interface MetricData {
  value: number;
  tags?: Record<string, string>;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private logger: pino.Logger;
  private metrics: Map<string, MetricData[]>;
  private readonly retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  private constructor() {
    this.logger = pino({
      level: process.env.MONITORING_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    }, pino.destination(join(process.cwd(), 'logs', 'metrics.log')));

    this.metrics = new Map();
    
    // Clean up old metrics periodically
    setInterval(() => this.cleanupOldMetrics(), this.retentionPeriod);
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Record a metric with an optional set of tags
   */
  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const timestamp = Date.now();
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricData: MetricData & { timestamp: number } = {
      value,
      tags,
      timestamp
    };

    this.metrics.get(name)!.push(metricData);
    this.logger.info({ metric: name, ...metricData }, 'Metric recorded');
  }

  /**
   * Get metrics for a specific name within a time range
   */
  getMetrics(name: string, startTime: number = Date.now() - this.retentionPeriod): MetricData[] {
    const metrics = this.metrics.get(name) || [];
    return metrics.filter(m => (m as any).timestamp >= startTime);
  }

  /**
   * Start timing an operation
   */
  startTimer(operationName: string): () => void {
    const startTime = process.hrtime();
    
    return () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const durationMs = seconds * 1000 + nanoseconds / 1e6;
      this.recordMetric(`${operationName}_duration_ms`, durationMs);
    };
  }

  /**
   * Record queue metrics
   */
  recordQueueMetrics(queueName: string, messageCount: number, processingTime: number): void {
    this.recordMetric(`queue_length`, messageCount, { queue: queueName });
    this.recordMetric(`processing_time_ms`, processingTime, { queue: queueName });
  }

  /**
   * Record error metrics
   */
  recordError(category: string, error: Error): void {
    this.recordMetric(`error_count`, 1, {
      category,
      type: error.name,
      message: error.message
    });
  }

  /**
   * Get a summary of metrics
   */
  getMetricsSummary(): Record<string, { 
    count: number;
    min: number;
    max: number;
    avg: number;
  }> {
    const summary: Record<string, any> = {};

    for (const [name, values] of this.metrics.entries()) {
      const numericValues = values.map(v => v.value);
      if (numericValues.length === 0) continue;

      summary[name] = {
        count: numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length
      };
    }

    return summary;
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.retentionPeriod;

    for (const [name, values] of this.metrics.entries()) {
      const filteredValues = values.filter(m => (m as any).timestamp >= cutoffTime);
      if (filteredValues.length !== values.length) {
        this.metrics.set(name, filteredValues);
        this.logger.debug(
          { metric: name, removed: values.length - filteredValues.length },
          'Cleaned up old metrics'
        );
      }
    }
  }
} 