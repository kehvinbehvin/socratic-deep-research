import { config } from 'dotenv';
import * as path from 'path';
import { S3Service } from '../src/services/S3Service';

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

async function testS3Service() {
  console.log('Starting S3 service test...');

  const region = process.env.S3_BUCKET_REGION;
  const bucket = process.env.S3_BUCKET;

  console.log('Configuration:', {
    region,
    bucket
  });

  if (!region || !bucket) {
    throw new Error('S3_BUCKET_REGION and S3_BUCKET environment variables must be set');
  }

  // Initialize S3 service
  const s3Service = new S3Service(region, bucket);

  const testKey = `test/s3-test-${Date.now()}.json`;
  const testData = {
    timestamp: new Date().toISOString(),
    message: 'This is a test object',
    metadata: {
      test: true,
      environment: process.env.NODE_ENV
    }
  };

  try {
    // Test 1: Upload object
    console.log('\n1. Testing object upload...');
    await s3Service.uploadJson(testKey, testData);
    console.log('✅ Upload successful');

    // Test 2: List objects
    console.log('\n2. Testing object listing...');
    const objects = await s3Service.listObjects('test/');
    console.log('Found objects:', objects);
    console.log('✅ List successful');

    // Test 3: Read object
    console.log('\n3. Testing object download...');
    const downloadedData = await s3Service.getJson(testKey);
    console.log('Downloaded data:', downloadedData);
    console.log('✅ Download successful');

    // Test 4: Verify data integrity
    console.log('\n4. Verifying data integrity...');
    const isMatch = JSON.stringify(testData) === JSON.stringify(downloadedData);
    if (!isMatch) {
      throw new Error('Downloaded data does not match uploaded data');
    }
    console.log('✅ Data integrity verified');

    console.log('\n✨ All S3 tests passed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testS3Service().catch(console.error); 