// src/services/CentralizedMetricsService.ts
import { Registry, Gauge, Counter, Histogram, Pushgateway } from 'prom-client';
import { MetricDefinition } from '../metrics/definitions';
import { LoggerService } from './LoggerService';
import axios from 'axios';

export class CentralizedMetricsService {
  private static instance: CentralizedMetricsService;
  private readonly registry: Registry;
  private readonly metrics: Map<string, Gauge<string> | Counter<string> | Histogram<string>>;
  private readonly pushgateway;
  private readonly pushgatewayUrl: string;

  private constructor(private readonly logger: LoggerService, pushgatewayUrl: string) {
    this.registry = new Registry();
    this.metrics = new Map();
    this.pushgatewayUrl = pushgatewayUrl;
    this.pushgateway = new Pushgateway(this.pushgatewayUrl, {
        timeout: 5000,
      }, this.registry);
  }

  static getInstance(logger: LoggerService, pushgatewayUrl: string): CentralizedMetricsService {
    if (!this.instance) {
      this.instance = new CentralizedMetricsService(logger, pushgatewayUrl);
    }
    return this.instance;
  }

  private getOrCreateMetric(definition: MetricDefinition) {
    const key = definition.name;
    if (!this.metrics.has(key)) {
      switch (definition.type) {
        case 'gauge':
          this.metrics.set(
            key,
            new Gauge({
              name: definition.name,
              help: definition.help,
              labelNames: definition.labelNames,
              registers: [this.registry]
            })
          );
          break;
        case 'counter':
          this.metrics.set(
            key,
            new Counter({
              name: definition.name,
              help: definition.help,
              labelNames: definition.labelNames,
              registers: [this.registry]
            })
          );
          break;
        case 'histogram':
          this.metrics.set(
            key,
            new Histogram({
              name: definition.name,
              help: definition.help,
              labelNames: definition.labelNames,
              registers: [this.registry],
              buckets: (definition as any).buckets || [0.1, 0.5, 1, 2, 5]
            })
          );
          break;
      }
    }
    return this.metrics.get(key)!;
  }

  observe(definition: MetricDefinition, value: number, labels: Record<string, string>) {
    const metric = this.getOrCreateMetric(definition);
    
    switch (definition.type) {
      case 'gauge':
        (metric as Gauge<string>).set(labels, value);
        break;
      case 'counter':
        (metric as Counter<string>).inc(labels, value);
        break;
      case 'histogram':
        (metric as Histogram<string>).observe(labels, value);
        break;
    }
  }

  async pushMetrics(jobName: string): Promise<void> {
    try {
      await this.pushgateway.pushAdd({ jobName });
      this.logger.info('Successfully pushed metrics to Pushgateway', { jobName });
    } catch (error) {
      this.logger.error('Failed to push metrics to Pushgateway', {
        error: error instanceof Error ? error.stack : String(error),
        jobName
      });
      throw error;
    }
  }

  public toPrometheusDuration(ms: number): string {
    const sec = Math.floor(ms / 1000);
    if (sec % 3600 === 0) return `${sec / 3600}h`;
    if (sec % 60 === 0) return `${sec / 60}m`;
    return `${sec}s`;
  }

  async queryMetrics(query: string, start: number, end: number): Promise<any[]> {
    try {
      const prometheusUrl = process.env.PROMETHEUS_URL || 'http://localhost:9090';
      const response = await axios.get(`${prometheusUrl}/api/v1/query_range`, {
        params: {
          query,
          start,
          end,
          step: '15s'
        }
      });
      
      if (response.data.status === 'success') {
        return response.data.data.result;
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to query metrics from Prometheus', {
        error: error instanceof Error ? error.stack : String(error),
        query,
        start,
        end
      });
      throw error;
    }
  }
}