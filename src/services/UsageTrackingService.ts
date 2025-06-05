// src/services/UsageTrackingService.ts
import { LoggerService } from './LoggerService';
import { costConfig, ServiceName, MetricType } from '../config/cost';
import { IUsageTrackingService, MetricData, UsageSummary } from '../types/usageTracking';
import { MetricDefinitions } from '../metrics/definitions';
import { CentralizedMetricsService } from './CentralisedMetricsService';

export class UsageTrackingService implements IUsageTrackingService {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly centralizedMetrics: CentralizedMetricsService,
    private readonly prometheusUrl: string
  ) {}

  /**
   * Record usage for billing and business metrics
   * This is specifically for tracking costs and usage limits
   */
  async recordUsage(
    metricName: string,
    value: number,
    tags: Record<string, string> = {}
  ): Promise<void> {
    const timestamp = Date.now();
    
    try {
      // Use specific business metric definitions
      switch(metricName) {
        case MetricDefinitions.usage.tokens.name:
          this.centralizedMetrics.observe(
            MetricDefinitions.usage.tokens,
            value,
            {
              service: tags.service,
              model: tags.model,
              operation: tags.operation
            }
          );
          break;
        
        case MetricDefinitions.usage.apiCalls.name:
          this.centralizedMetrics.observe(
            MetricDefinitions.usage.apiCalls,
            value,
            {
              service: tags.service,
              endpoint: tags.endpoint
            }
          );
          break;

        default:
          this.loggerService.warn('Unknown metric name', { metricName });
          break;  
      }

      // Push metrics immediately
      await this.centralizedMetrics.pushMetrics(`usage_${tags.service || 'unknown'}`);

      this.loggerService.info('Usage recorded for billing', {
        metric: metricName,
        value,
        tags,
        timestamp
      });
    } catch (error) {
      this.loggerService.error('Failed to record usage', {
        error: error instanceof Error ? error.stack : String(error),
        metric: metricName,
        value,
        tags
      });
      // Don't throw - we don't want billing metrics to break core functionality
    }
  }

  /**
   * Calculate service costs based on usage
   */
  async calculateCredits(
    serviceName: ServiceName,
    startTime: number,
    endTime: number = Date.now()
  ): Promise<number> {
    try {
      let totalCost = 0;
      const serviceConfig = costConfig[serviceName];

      // Calculate cost for each metric type
      for (const [metricType, rate] of Object.entries(serviceConfig)) {
        const metrics = await this.getUsageMetrics(
          serviceName,
          metricType,
          startTime,
          endTime
        );

        const usage = metrics.reduce((sum, metric) => sum + metric.value, 0);
        const cost = usage * rate;
        
        // Record the cost calculation
        this.centralizedMetrics.observe(
          MetricDefinitions.usage.cost,
          cost,
          {
            service: serviceName,
            metric_type: metricType
          }
        );

        totalCost += cost;
      }

      return Number(totalCost.toFixed(6));
    } catch (error) {
      this.loggerService.error('Failed to calculate credits', {
        error: error instanceof Error ? error.stack : String(error),
        serviceName,
        startTime,
        endTime
      });
      throw error;
    }
  }

  /**
   * Get historical usage metrics for reporting
   */
  async getUsageMetrics(
    serviceName: string,
    metricName: string,
    startTime: number,
    endTime: number = Date.now(),
    tags: Record<string, string> = {}
  ): Promise<MetricData[]> {
    try {
      // Convert milliseconds to seconds (Prometheus expects seconds)
      const startSeconds = Math.floor(startTime / 1000);
      const endSeconds = Math.floor(endTime / 1000);
  
      // Calculate duration in ms, convert to Prometheus duration string like "1h", "30m"
      const durationMs = endTime - startTime;
      const durationStr = this.centralizedMetrics.toPrometheusDuration(durationMs);
  
      // Compose the Prometheus query using an aggregation (example: sum_over_time)
      // Adjust aggregation based on your metric type
      let labelSelectors = `service="${serviceName}"`;
  
      // Include extra tags if provided
      for (const [key, value] of Object.entries(tags)) {
        labelSelectors += `,${key}="${value}"`;
      }
  
      const query = `sum_over_time(${metricName}{${labelSelectors}}[${durationStr}])`;
  
      const metrics = await this.centralizedMetrics.queryMetrics(
        query,
        startSeconds,
        endSeconds
      );
  
      // Map Prometheus response format: each result has a metric and values array
      return metrics.flatMap(result =>
        result.values.map(([timestamp, value]: [string, string]) => ({
          timestamp: Number(timestamp) * 1000, // convert back to ms
          value: Number(value),
          tags: result.metric
        }))
      );
    } catch (error) {
      this.loggerService.error('Failed to get usage metrics', {
        error: error instanceof Error ? error.stack : String(error),
        serviceName,
        metricName,
        startTime,
        endTime
      });
      throw error;
    }
  }

  /**
   * Generate usage summary for billing and reporting
   */
  async getUsageSummary(
    startTime: number,
    endTime: number = Date.now()
  ): Promise<UsageSummary> {
    try {
      const summary: UsageSummary = {
        totalCost: 0,
        metrics: {},
        breakdown: {}
      };

      // Calculate usage and cost for each service
      for (const serviceName of Object.keys(costConfig) as ServiceName[]) {
        const serviceConfig = costConfig[serviceName];
        let serviceCost = 0;
        const usage: Record<string, number> = {};

        for (const metricType of Object.keys(serviceConfig)) {
          const metrics = await this.getUsageMetrics(
            serviceName,
            metricType,
            startTime,
            endTime
          );

          const totalUsage = metrics.reduce((sum, metric) => sum + metric.value, 0);
          usage[metricType] = totalUsage;
          serviceCost += totalUsage * serviceConfig[metricType as MetricType<typeof serviceName>];

          summary.metrics[`${serviceName}.${metricType}`] = totalUsage;
        }

        summary.breakdown[serviceName] = {
          cost: Number(serviceCost.toFixed(6)),
          usage
        };

        summary.totalCost += serviceCost;
      }

      summary.totalCost = Number(summary.totalCost.toFixed(6));

      // Record summary metrics
      this.centralizedMetrics.observe(
        MetricDefinitions.usage.totalCost,
        summary.totalCost,
        { period: `${endTime - startTime}ms` }
      );

      return summary;
    } catch (error) {
      this.loggerService.error('Failed to get usage summary', {
        error: error instanceof Error ? error.stack : String(error),
        startTime,
        endTime
      });
      throw error;
    }
  }
}