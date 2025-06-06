import { getJson, BaseResponse } from 'serpapi';
import { LoggerService } from '../services/LoggerService';
import { CentralizedMetricsService } from './CentralisedMetricsService';
import { MetricDefinitions } from '../metrics/definitions';

export interface SerpApiResult {
  position: number;
  title: string;
  snippet: string;
  url: string;
}

export class SerpApiService {
  private readonly apiKey: string;
  private readonly logger: LoggerService;
  private readonly metrics: CentralizedMetricsService;

  constructor(apiKey: string, metrics: CentralizedMetricsService) {
    this.apiKey = apiKey;
    this.logger = LoggerService.getInstance();
    this.metrics = metrics;
  }

  async search(query: string, numResults: number = 10): Promise<SerpApiResult[]> {
    const startTime = Date.now();
    const endpoint = 'serpapi_google';
    const service = 'serpapi';

    try {
      // Record API call attempt
      this.metrics.observe(MetricDefinitions.usage.apiCalls, 1, {
        service: service,
        operation: 'serpapi_search_attempt',
        endpoint: endpoint
      }); 

      const location = 'us';

      const response: BaseResponse = await getJson({
        engine: "google",
        api_key: this.apiKey,
        q: query,
        num: numResults,
        gl: location // Set Google location to US
      });

      // We don't want to increment the api calls metric for successful calls since we already did that in the attempt
      this.metrics.observe(MetricDefinitions.usage.apiCalls, 0, {
        service: service,
        operation: 'serpapi_search_success',
        endpoint: endpoint
      }); 

      const duration = (Date.now() - startTime) 
      this.metrics.observe(MetricDefinitions.usage.duration, duration, {
        service: service,
        endpoint: endpoint,
        status: 'success'
      });

      const organicResults = response.organic_results || [];

      return organicResults.map((result: any, index: number) => ({
        position: index + 1,
        title: result.title,
        snippet: result.snippet,
        url: result.link
      }));

    } catch (error) {
      const duration = (Date.now() - startTime)
      this.metrics.observe(MetricDefinitions.usage.duration, duration, {
        service: service,
        endpoint: endpoint,
        status: 'error'
      });

      this.metrics.observe(MetricDefinitions.error.errorCount, 1, {
        service: service,
        category: 'serpapi_search_error',
        message: error instanceof Error ? error.message : 'unknown',
        type: error instanceof Error ? error.name : 'unknown'
      });

      this.logger.error('Search failed', {
        error: error instanceof Error ? error.stack : String(error),
        query
      });
      throw error;
    }
  }
} 