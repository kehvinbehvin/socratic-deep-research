import axios from 'axios';
import { LoggerService } from '../services/LoggerService';

interface SerpApiResult {
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
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: this.apiKey,
          engine: 'google',
          num: numResults
        }
      });

      const organicResults = response.data.organic_results || [];
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