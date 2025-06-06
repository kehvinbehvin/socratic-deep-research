// scripts/test-usageTracking.ts
import { LoggerService } from '../src/services/LoggerService';
import { ServiceFactory } from '../src/services/ServiceFactory';
import { UsageTrackingService } from '../src/services/UsageTrackingService';
import dotenv from 'dotenv';
import { initializeDatabase } from '../src/config/database';
import { MetricDefinitions } from '../src/metrics/definitions';

dotenv.config();

async function testUsageTracking() {
  // Initialize services
  const dataSource = await initializeDatabase();
  const serviceFactory = await ServiceFactory.initialize(dataSource);
  const logger: LoggerService = serviceFactory.getLoggerService();

  const usageTracking = new UsageTrackingService(logger, serviceFactory.getCentralizedMetrics(), process.env.PROMETHEUS_URL || 'http://localhost:9090');

  try {
    // Test 1: Record usage
    console.log('\n=== Testing Usage Recording ===');
    await usageTracking.recordUsage(MetricDefinitions.usage.tokens.name, 1000, {
      service: 'openai',
      model: 'gpt-4o',
      operation: 'embeddings'
    });

    await usageTracking.recordUsage(MetricDefinitions.usage.apiCalls.name, 1, {
      service: 'openai',
      endpoint: 'embeddings'
    });

    // Test 2: Calculate credits
    console.log('\n=== Testing Credit Calculation ===');
    const startTime = Date.now() - 3600000; // Last hour
    const credits = await usageTracking.calculateCredits('openai', startTime);
    console.log('Estimated credits used:', credits);

    // Test 3: Get usage summary
    console.log('\n=== Testing Usage Summary ===');
    const summary = await usageTracking.getUsageSummary(startTime);
    console.log('Usage Summary:', JSON.stringify(summary, null, 2));

    await ServiceFactory.close();

  } catch (error) {
    await ServiceFactory.close();
    console.error('Test failed:', error);
  }
}

testUsageTracking();