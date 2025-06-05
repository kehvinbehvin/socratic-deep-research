// src/metrics/types.ts
export type PrometheusMetricType = 'gauge' | 'counter' | 'histogram' | 'summary';

// For cost/billing metrics
export type { MetricType } from '../config/cost';