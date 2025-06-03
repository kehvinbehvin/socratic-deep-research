export const QUEUE_NAMES = {
  TOPIC: 'topic-queue',
  QUESTION: 'question-queue',
  REFLECTION: 'reflection-queue',
  CLARIFICATION: 'clarification-queue',
  QUERY_PREPARATION: 'query-preparation-queue',
  SEARCH: 'search-queue',
  CRAWL: 'crawl-queue',
  REVIEW: 'review-queue',
  COMPLETE: 'complete-queue'
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

export interface QueueConfig {
  name: QueueName;
  visibilityTimeout: number;  // seconds
  maxRetries: number;
  retryDelay: number;  // seconds
}

export const QUEUE_CONFIGS: Record<QueueName, QueueConfig> = {
  [QUEUE_NAMES.TOPIC]: {
    name: QUEUE_NAMES.TOPIC,
    visibilityTimeout: 60,
    maxRetries: 3,
    retryDelay: 300
  },
  [QUEUE_NAMES.QUESTION]: {
    name: QUEUE_NAMES.QUESTION,
    visibilityTimeout: 120,
    maxRetries: 3,
    retryDelay: 300
  },
  [QUEUE_NAMES.REFLECTION]: {
    name: QUEUE_NAMES.REFLECTION,
    visibilityTimeout: 60,
    maxRetries: 3,
    retryDelay: 300
  },
  [QUEUE_NAMES.CLARIFICATION]: {
    name: QUEUE_NAMES.CLARIFICATION,
    visibilityTimeout: 60,
    maxRetries: 3,
    retryDelay: 300
  },
  [QUEUE_NAMES.QUERY_PREPARATION]: {
    name: QUEUE_NAMES.QUERY_PREPARATION,
    visibilityTimeout: 120,
    maxRetries: 3,
    retryDelay: 300
  },
  [QUEUE_NAMES.SEARCH]: {
    name: QUEUE_NAMES.SEARCH,
    visibilityTimeout: 180,
    maxRetries: 3,
    retryDelay: 300
  },
  [QUEUE_NAMES.CRAWL]: {
    name: QUEUE_NAMES.CRAWL,
    visibilityTimeout: 300,
    maxRetries: 3,
    retryDelay: 600
  },
  [QUEUE_NAMES.REVIEW]: {
    name: QUEUE_NAMES.REVIEW,
    visibilityTimeout: 180,
    maxRetries: 3,
    retryDelay: 300
  },
  [QUEUE_NAMES.COMPLETE]: {
    name: QUEUE_NAMES.COMPLETE,
    visibilityTimeout: 60,
    maxRetries: 3,
    retryDelay: 300
  }
}; 