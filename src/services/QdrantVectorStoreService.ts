import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import { LoggerService } from './LoggerService';
import { v4 as uuidv4 } from 'uuid';
import { CentralizedMetricsService } from './CentralisedMetricsService';
import { MetricDefinitions } from '../metrics/definitions';


export class QdrantVectorStoreService {
  private qdrant: QdrantClient;
  private openai: OpenAI;
  private collectionName: string;
  private embeddingModel: string;
  private metrics: CentralizedMetricsService;
  
  constructor(
    private readonly loggerService: LoggerService,
    private readonly pushgatewayUrl: string,
    qdrantUrl: string,
    openaiApiKey: string,
    collectionName = 'documents',
    embeddingModel = 'text-embedding-3-small',
  ) {
    this.qdrant = new QdrantClient({ url: qdrantUrl });
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.collectionName = collectionName;
    this.embeddingModel = embeddingModel;
    this.metrics = CentralizedMetricsService.getInstance(loggerService, this.pushgatewayUrl);

    this.loggerService.info('QdrantVectorStoreService initialized', {
      collectionName,
      embeddingModel,
    });

    // Initialize collection
    this.createCollection()
      .catch(error => {
        this.loggerService.error('Failed to create collection during initialization', { error });
      });
  }

  private async embed(text: string): Promise<number[]> {
    try {
      const startTime = Date.now();
      const res = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      if (!res.data[0]?.embedding?.length) {
        throw new Error('Empty embedding returned by OpenAI');
      }

      // Record metrics
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      this.metrics.observe(
        MetricDefinitions.vectorStore.embeddingDuration,
        duration,
        { model: this.embeddingModel }
      );
      this.metrics.observe(
        MetricDefinitions.vectorStore.embeddingOperations,
        1,
        { model: this.embeddingModel, status: 'success' }
      );

      return res.data[0].embedding;
    } catch (error) {
      this.loggerService.error('Error generating embedding', { error });
      this.metrics.observe(
        MetricDefinitions.vectorStore.embeddingOperations,
        1,
        { model: this.embeddingModel, status: 'error' }
      );
      throw error;
    }
  }

  async indexText(text: string, metadata: Record<string, any> = {}): Promise<string> {
    try {
      const id = uuidv4();
      const startTime = Date.now();
      const vector = await this.embed(text);

      const payload = { text, ...metadata };
      
      await this.qdrant.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id,
            vector,
            payload,
          },
        ],
      });

      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observe(
        MetricDefinitions.vectorStore.indexingDuration,
        duration,
        { collection: this.collectionName }
      );
      this.metrics.observe(
        MetricDefinitions.vectorStore.indexingOperations,
        1,
        { collection: this.collectionName, status: 'success' }
      );

      this.loggerService.info('Successfully indexed text', { id });

      return id;
    } catch (error) {
      this.loggerService.error('Error indexing text', { error });
      this.metrics.observe(
        MetricDefinitions.vectorStore.indexingOperations,
        1,
        { collection: this.collectionName, status: 'error' }
      );
      throw error;
    }
  }

  async searchText(query: string, topK = 5): Promise<{ id: string; score: number; text?: string }[]> {
    try {
      const startTime = Date.now();
      const vector = await this.embed(query);
      
      const results = await this.qdrant.search(this.collectionName, {
        vector,
        limit: topK,
        with_payload: true,
      });

      const duration = Date.now() - startTime;
      this.metrics.observe(
        MetricDefinitions.vectorStore.searchDuration,
        duration,
        { collection: this.collectionName }
      );
      this.metrics.observe(
        MetricDefinitions.vectorStore.searchOperations,
        1,
        { collection: this.collectionName, status: 'success' }
      );

      this.loggerService.info('Successfully searched text', { 
        query: query.substring(0, 100), // Log only first 100 chars
        resultCount: results.length 
      });

      return results.map(item => ({
        id: item.id?.toString() ?? '',
        score: item.score,
        text: (item.payload as any)?.text ?? '',
      }));
    } catch (error) {
      this.loggerService.error('Error searching text', { error, query: query.substring(0, 100) });
      this.metrics.observe(
        MetricDefinitions.vectorStore.searchOperations,
        1,
        { collection: this.collectionName, status: 'error' }
      );
      throw error;
    }
  }

  async createCollection(dimension: number = 1536): Promise<void> {
    try {
        const exists = await this.qdrant.getCollections().then(res => res.collections.some(col => col.name === this.collectionName));
        if (!exists) {
            await this.qdrant.createCollection(this.collectionName, {
                vectors: {
                  size: dimension,
                  distance: 'Cosine',
                },
              });

            this.loggerService.info('Created collection', { collectionName: this.collectionName });
        } else {
            this.loggerService.info('Collection already exists', { collectionName: this.collectionName });
        }
    } catch (error) {
      this.loggerService.error('Error creating collection', { error });
      throw error;
    }
  }
} 