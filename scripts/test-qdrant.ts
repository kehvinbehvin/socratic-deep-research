import { QdrantVectorStoreService } from '../src/services/QdrantVectorStoreService';
import { LoggerService } from '../src/services/LoggerService';
import { initializeDatabase } from '../src/config/database';
import { ServiceFactory } from '../src/services/ServiceFactory';
import { MonitoringService } from '../src/services/MonitoringService';
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
  const logger: LoggerService = serviceFactory.getLoggerService();
  const monitoring: MonitoringService = serviceFactory.getMonitoring();

  const qdrantService = new QdrantVectorStoreService(
    logger,
    monitoring,
    'http://localhost:6333', // Using local Docker container
    process.env.OPENAI_API_KEY!, // Make sure to set this env variable
    'test_collection'
  );

  try {
    // Test 1: Index some sample texts
    console.log('\n=== Testing Text Indexing ===');
    const id1 = await qdrantService.indexText(
      'The quick brown fox jumps over the lazy dog',
      { source: 'test1' }
    );
    console.log('Indexed text 1 with ID:', id1);

    const id2 = await qdrantService.indexText(
      'The lazy dog sleeps while the quick fox runs',
      { source: 'test2' }
    );
    console.log('Indexed text 2 with ID:', id2);

    // Test 2: Search for similar texts
    console.log('\n=== Testing Search ===');
    const searchResults = await qdrantService.searchText('quick fox', 5);
    console.log('Search results:', JSON.stringify(searchResults, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await cleanupCollection(process.env.QDRANT_URL!, 'test_collection');

    // Close database connection
    await dataSource.destroy();
  }
}

// Run the test
if (require.main === module) {
  // Ensure OPENAI_API_KEY is set
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