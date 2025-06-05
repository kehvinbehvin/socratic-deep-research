// scripts/test-qdrant.ts
import { QdrantVectorStoreService } from '../src/services/QdrantVectorStoreService';
import { LoggerService } from '../src/services/LoggerService';
import { initializeDatabase } from '../src/config/database';
import { ServiceFactory } from '../src/services/ServiceFactory';
import { CentralizedMetricsService } from '../src/services/CentralisedMetricsService';
import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/js-client-rest';

dotenv.config();

async function cleanupCollection(qdrantUrl: string, collectionName: string) {
  const client = new QdrantClient({ url: qdrantUrl });
  try {
    const collections = await client.getCollections();
    if (collections.collections.some(col => col.name === collectionName)) {
      console.log(`Cleaning up collection: ${collectionName}`);
      await client.deleteCollection(collectionName);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

async function testQdrantService() {
  // Initialize services
  const dataSource = await initializeDatabase();
  const serviceFactory = await ServiceFactory.initialize(dataSource);
  const qdrantService = serviceFactory.getQdrantVectorStoreService();
  const logger: LoggerService = serviceFactory.getLoggerService();

  try {
    // Test 1: Index some sample texts
    logger.info('\n=== Testing Text Indexing ===');
    const id1 = await qdrantService.indexText(
      'The quick brown fox jumps over the lazy dog',
      { source: 'test1' }
    );
    logger.info('Indexed text 1 with ID:', { id: id1 });

    const id2 = await qdrantService.indexText(
      'The lazy dog sleeps while the quick fox runs',
      { source: 'test2' }
    );
    logger.info('Indexed text 2 with ID:', { id: id2 });

    // Test 2: Search for similar texts
    logger.info('\n=== Testing Search ===');
    const searchResults = await qdrantService.searchText('quick fox', 5);
    logger.info('Search results:', searchResults);

    // Push metrics before cleanup since this is a short-lived process
    await serviceFactory.getCentralizedMetrics().pushMetrics('qdrant_test');
  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    await cleanupCollection(process.env.QDRANT_URL!, 'test_collection');
    await dataSource.destroy();
  }
}

testQdrantService();