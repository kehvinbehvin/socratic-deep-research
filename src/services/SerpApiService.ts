import { getJson, BaseResponse } from 'serpapi';
import { LoggerService } from '../services/LoggerService';

export interface SerpApiResult {
  position: number;
  title: string;
  snippet: string;
  url: string;
}

export class SerpApiService {
  private readonly apiKey: string;
  private readonly logger: LoggerService;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.logger = LoggerService.getInstance();
  }

  async search(query: string, numResults: number = 10): Promise<SerpApiResult[]> {
    try {
      console.log("Check API key", this.apiKey)
      const response: BaseResponse = await getJson({
        engine: "google",
        api_key: this.apiKey,
        q: query,
        num: numResults,
        gl: 'us' // Set Google location to US
      });

      const organicResults = response.organic_results || [];
      return organicResults.map((result: any, index: number) => ({
        position: index + 1,
        title: result.title,
        snippet: result.snippet,
        url: result.link
      }));

    } catch (error) {
      this.logger.error('Search failed', {
        error: error instanceof Error ? error.stack : String(error),
        query
      });
      throw error;
    }
  }
} 