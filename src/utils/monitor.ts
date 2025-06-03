import { MonitoringService } from '../services/MonitoringService';
import { LoggerService } from '../services/LoggerService';
import { QUEUE_NAMES } from '../config/queues';

export class SystemMonitor {
  private monitoring: MonitoringService;
  private logger: LoggerService;

  constructor() {
    this.monitoring = MonitoringService.getInstance();
    this.logger = LoggerService.getInstance();
  }

  /**
   * Get a summary of all queue metrics
   */
  getQueueMetrics(): void {
    const summary = this.monitoring.getMetricsSummary();
    
    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queueMetrics = {
        length: summary[`queue_length`]?.avg || 0,
        processingTime: summary[`${queueName}_processing_duration_ms`]?.avg || 0,
        successRate: this.calculateSuccessRate(queueName, summary),
        errorCount: summary[`error_count`]?.count || 0
      };

      this.logger.info(`Queue Metrics for ${queueName}`, queueMetrics);
    }
  }

  /**
   * Get detailed metrics for a specific queue
   */
  getQueueDetails(queueName: string): void {
    const metrics = {
      messages: this.monitoring.getMetrics(`queue_length`).filter(m => m.tags?.queue === queueName),
      processing: this.monitoring.getMetrics(`${queueName}_processing_duration_ms`),
      success: this.monitoring.getMetrics(`${queueName}_success`),
      errors: this.monitoring.getMetrics('error_count').filter(m => m.tags?.category === queueName)
    };

    this.logger.info(`Detailed metrics for ${queueName}`, {
      messageCount: metrics.messages.length,
      avgProcessingTime: this.calculateAverage(metrics.processing.map(m => m.value)),
      successCount: metrics.success.length,
      errorCount: metrics.errors.length,
      recentErrors: metrics.errors.slice(-5).map(e => e.tags)
    });
  }

  /**
   * Get system health status
   */
  getSystemHealth(): void {
    const summary = this.monitoring.getMetricsSummary();
    const health = {
      status: this.calculateSystemStatus(summary),
      queueHealth: {} as Record<string, string>
    };

    for (const queueName of Object.values(QUEUE_NAMES)) {
      health.queueHealth[queueName] = this.calculateQueueHealth(queueName, summary);
    }

    this.logger.info('System Health Status', health);
  }

  private calculateSuccessRate(queueName: string, summary: Record<string, any>): number {
    const successCount = summary[`${queueName}_success`]?.count || 0;
    const errorCount = summary[`error_count`]?.count || 0;
    const total = successCount + errorCount;
    return total > 0 ? (successCount / total) * 100 : 100;
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }

  private calculateSystemStatus(summary: Record<string, any>): 'healthy' | 'degraded' | 'unhealthy' {
    const errorCount = summary[`error_count`]?.count || 0;
    const totalMessages = Object.values(QUEUE_NAMES)
      .map(queue => summary[`queue_length`]?.count || 0)
      .reduce((a, b) => a + b, 0);

    if (errorCount === 0) return 'healthy';
    if (errorCount / totalMessages < 0.1) return 'degraded';
    return 'unhealthy';
  }

  private calculateQueueHealth(queueName: string, summary: Record<string, any>): string {
    const successRate = this.calculateSuccessRate(queueName, summary);
    const avgProcessingTime = summary[`${queueName}_processing_duration_ms`]?.avg || 0;

    if (successRate >= 99 && avgProcessingTime < 1000) return 'healthy';
    if (successRate >= 95 && avgProcessingTime < 5000) return 'degraded';
    return 'unhealthy';
  }
} 