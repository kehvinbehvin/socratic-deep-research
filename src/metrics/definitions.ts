import { PrometheusMetricType } from './types';

export interface MetricDefinition {
  name: string;
  help: string;
  type: PrometheusMetricType;
  labelNames: string[];
}

export const EmbeddingDuration: MetricDefinition = {
    name: 'vector_embedding_duration_seconds',
    help: 'Time taken to generate embeddings',
    type: 'gauge',
    labelNames: ['model']
}

export const EmbeddingOperations: MetricDefinition = {
    name: 'vector_embedding_operations_total',
    help: 'Number of embedding operations',
    type: 'counter',
    labelNames: ['model', 'status']
}

export const IndexingDuration: MetricDefinition = {
    name: 'vector_indexing_duration_seconds',
    help: 'Time taken to index vectors',
    type: 'gauge',
    labelNames: ['collection']
}

export const IndexingOperations: MetricDefinition = {
    name: 'vector_indexing_operations_total',
    help: 'Number of indexing operations',
    type: 'counter',
    labelNames: ['collection', 'status']
}

export const SearchDuration: MetricDefinition = {
    name: 'vector_search_duration_seconds',
    help: 'Time taken to search vectors',
    type: 'gauge',
    labelNames: ['collection']
}

export const SearchOperations: MetricDefinition = {
    name: 'vector_search_operations_total',
    help: 'Number of search operations',
    type: 'counter',
    labelNames: ['collection', 'status']
}
// Queue metrics
export const QueueLengthMetrics: MetricDefinition = {
    name: 'queue_length',
    help: 'Current number of messages in queue',
    type: 'gauge',
    labelNames: ['queue_name']
}

export const QueueProcessingTimeMetrics: MetricDefinition = {
    name: 'queue_processing_duration_seconds',
    help: 'Time taken to process queue messages',
    type: 'histogram',
    labelNames: ['queue_name', 'status'],
}

export const ApiCallsMetrics: MetricDefinition = {
    name: 'api_calls_total',
    help: 'Total number of API calls',
    type: 'counter',
    labelNames: ['service', 'endpoint', 'operation']
}

export const TokensMetrics: MetricDefinition = {
    name: 'token_usage_total',
    help: 'Total number of tokens used',
    type: 'counter',
    labelNames: ['service', 'model', 'operation']
}

export const ErrorMetrics: MetricDefinition = {
    name: 'error_count',
    help: 'Error count by category and type',
    type: 'counter',
    labelNames: ['category', 'type', 'message','service']
}

export const CostMetrics: MetricDefinition = {
    name: 'cost_total',
    help: 'Total cost of usage',
    type: 'gauge',
    labelNames: ['service', 'metric_type']
}

export const TotalCostMetrics: MetricDefinition = {
    name: 'total_cost',
    help: 'Total cost across all services',
    type: 'gauge' as const,
    labelNames: ['period'] as const
}

export const LambdaInvocationsMetrics: MetricDefinition = {
    name: 'lambda_invocations_total',
    help: 'Total number of Lambda invocations',
    type: 'counter',
    labelNames: ['handler', 'type']
}

export const LambdaDurationMetrics: MetricDefinition = {
    name: 'lambda_duration_seconds',
    help: 'Duration of Lambda invocations',
    type: 'histogram',
    labelNames: ['handler', 'type', 'status']
}

export const LambdaErrorsMetrics: MetricDefinition = {
    name: 'lambda_errors_total',
    help: 'Total number of errors in Lambda invocations',
    type: 'counter',
    labelNames: ['handler', 'type', 'error_type']
}

export const LambdaSuccessMetrics: MetricDefinition = {
    name: 'lambda_success_total',
    help: 'Total number of successful Lambda invocations',
    type: 'counter',
    labelNames: ['handler', 'type']
}

export const APICallDurationMetrics: MetricDefinition = {
    name: 'api_call_duration_seconds',
    help: 'Duration of API calls',
    type: 'histogram',
    labelNames: ['service', 'endpoint', 'status']
}

export const MetricDefinitions = {
    // Vector Store Metrics
    vectorStore: {
        embeddingDuration: EmbeddingDuration,
        embeddingOperations: EmbeddingOperations,
        indexingDuration: IndexingDuration,
        indexingOperations: IndexingOperations,
        searchDuration: SearchDuration,
        searchOperations: SearchOperations,
    },

    // Queue Metrics
    queue: {
        queueLength: QueueLengthMetrics,
        queueProcessingTime: QueueProcessingTimeMetrics,
    },

    // Usage Metrics
    usage: {
        apiCalls: ApiCallsMetrics,
        tokens: TokensMetrics,
        cost: CostMetrics,
        totalCost: TotalCostMetrics,
        duration: APICallDurationMetrics,
    },

    // Lambda Metrics
    lambda: {
        invocations: LambdaInvocationsMetrics,
        duration: LambdaDurationMetrics,
        errors: LambdaErrorsMetrics,
        success: LambdaSuccessMetrics,
    },

    // Error Metrics
    error: {
        errorCount: ErrorMetrics,
    },
    // Add other metric groups as needed...
} as const;