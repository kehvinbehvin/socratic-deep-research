export interface MetricData {
    timestamp: number;
    value: number;
    tags?: Record<string, string>;
  }
  
  export interface UsageSummary {
    totalCost: number;
    metrics: Record<string, number>;
    breakdown: {
      [service: string]: {
        cost: number;
        usage: Record<string, number>;
      };
    };
  }
  
  export interface IUsageTrackingService {
    recordUsage(
      metricName: string, 
      value: number, 
      tags?: Record<string, string>
    ): void;
  
    calculateCredits(
      serviceName: string,
      startTime: number,
      endTime?: number
    ): Promise<number>;
  
    getUsageMetrics(
      serviceName: string,
      metricName: string,
      startTime: number,
      endTime?: number,
      tags?: Record<string, string>
    ): Promise<MetricData[]>;
  
    getUsageSummary(
      startTime: number,
      endTime?: number
    ): Promise<UsageSummary>;
  }