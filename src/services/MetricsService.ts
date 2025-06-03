import { MonitoringService } from './MonitoringService';
import { SystemMonitor } from '../utils/monitor';
import { LoggerService } from './LoggerService';
import { z } from 'zod';
import { QUEUE_NAMES } from '../config/queues';

// Define health status types
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

// Schema for metrics response
export const MetricsResponseSchema = z.object({
  systemHealth: z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    queueHealth: z.record(z.string(), z.enum(['healthy', 'degraded', 'unhealthy']))
  }),
  queueMetrics: z.record(z.string(), z.array(z.object({
    timestamp: z.number(),
    value: z.number()
  })))
});

export type MetricsResponse = z.infer<typeof MetricsResponseSchema>;

export class MetricsService {
  constructor(
    private readonly monitoring: MonitoringService,
    private readonly systemMonitor: SystemMonitor,
    private readonly logger: LoggerService
  ) {}

  public async getMetrics(): Promise<MetricsResponse> {
    try {
      this.logger.info('Fetching system metrics');
      
      const health = this.systemMonitor.getSystemHealth();
      const systemHealth = {
        status: health.status as HealthStatus,
        queueHealth: Object.entries(health.queueHealth).reduce((acc, [key, value]) => {
          acc[key] = value as HealthStatus;
          return acc;
        }, {} as Record<string, HealthStatus>)
      };

      const now = Date.now();
      const startTime = now - 24 * 60 * 60 * 1000; // 24 hours ago
      
      // Get metrics for all queues
      const queueMetrics: Record<string, any> = {};
      
      for (const queueName of Object.values(QUEUE_NAMES)) {
        this.logger.debug(`Fetching metrics for queue: ${queueName}`);
        
        queueMetrics[`${queueName}_length`] = this.monitoring.getMetrics(`queue_length`, startTime)
          .filter(m => m.tags?.queue === queueName)
          .map(m => ({
            timestamp: (m as any).timestamp,
            value: m.value
          }));
        
        queueMetrics[`${queueName}_processing_time`] = this.monitoring.getMetrics(`${queueName}_processing_duration_ms`, startTime)
          .map(m => ({
            timestamp: (m as any).timestamp,
            value: m.value
          }));
      }

      this.logger.info('Successfully fetched system metrics', {
        healthStatus: systemHealth.status,
        queueCount: Object.keys(queueMetrics).length
      });

      return {
        systemHealth,
        queueMetrics
      };
    } catch (error) {
      this.logger.error('Error fetching system metrics', {
        error: error instanceof Error ? error.stack : String(error)
      });
      throw error;
    }
  }
} 