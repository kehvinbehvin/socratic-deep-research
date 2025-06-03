export type StudyStage = 
  | 'TOPIC'
  | 'QUESTION'
  | 'REFLECTION'
  | 'CLARIFICATION'
  | 'QUERY_PREPARATION'
  | 'SEARCH'
  | 'CRAWL'
  | 'REVIEW'
  | 'COMPLETED'
  | 'FAILED';

export interface Study {
  id: string;
  topic: string;
  stage: StudyStage;
  createdAt: string;
  updatedAt: string;
  questions?: string[];
  reflections?: string[];
  clarifications?: string[];
  searchQueries?: string[];
  searchResults?: {
    url: string;
    title: string;
    snippet: string;
  }[];
  crawlResults?: {
    url: string;
    s3Key: string;
    reliability: number;
  }[];
  reviewResults?: {
    chunkId: string;
    content: string;
    relevanceScore: number;
  }[];
  error?: string;
}

export interface SystemHealth {
  status: string;
  queueHealth: {
    'topic-queue': string;
    'question-queue': string;
    'reflection-queue': string;
    'clarification-queue': string;
    'query-preparation-queue': string;
    'search-queue': string;
    'crawl-queue': string;
    'review-queue': string;
    'completed-queue': string;
  };
}

export interface QueueMetrics {
  timestamp: number;
  value: number;
} 