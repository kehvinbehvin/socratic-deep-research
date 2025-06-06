// scripts/test-qdrant.ts
import { LoggerService } from '../src/services/LoggerService';
import { initializeDatabase } from '../src/config/database';
import { ServiceFactory } from '../src/services/ServiceFactory';
import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantVectorStoreService } from '../src/services/QdrantVectorStoreService';

dotenv.config();

const TEST_COLLECTION = 'test_collection';

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
  const logger: LoggerService = serviceFactory.getLoggerService();

  // Initialize QdrantVectorStoreService with test collection
  const qdrantService = new QdrantVectorStoreService(
    logger,
    process.env.PUSHGATEWAY_URL || 'http://localhost:9091',
    process.env.QDRANT_URL || 'http://localhost:6333',
    process.env.OPENAI_API_KEY!,
    TEST_COLLECTION,
    'text-embedding-3-small'
  );

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
    logger.info('Search results:', { count: searchResults.length, results: searchResults });

  } catch (error) {
    logger.error('Test failed:', { error });
    throw error;
  } finally {
    await cleanupCollection(process.env.QDRANT_URL || 'http://localhost:6333', TEST_COLLECTION);
    await ServiceFactory.close();
  }
}

// Run the test
if (require.main === module) {
  // Ensure required environment variables are set
  if (!process.env.OPENAI_API_KEY) {
    console.error('Please set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  testQdrantService()
    .then(() => {
      console.log('\nTest completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\nTest failed:', error);
      process.exit(1);
    });
}