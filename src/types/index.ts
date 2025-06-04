export * from './dtos';

// Re-export entity types to avoid circular dependencies
import type { Topic } from '../entities/Topic';
import type { Question } from '../entities/Question';
import type { Reflection } from '../entities/Reflection';
import type { Clarification } from '../entities/Clarification';
import type { QueryPreparation } from '../entities/QueryPreparation';
import type { SearchResult } from '../entities/SearchResult';
import type { CrawlResult } from '../entities/CrawlResult';
import type { Review } from '../entities/Review';
import { ProcessingStatus } from '../entities/BaseEntity';

export type {
  Topic,
  Question,
  Reflection,
  Clarification,
  QueryPreparation,
  SearchResult,
  CrawlResult,
  Review
};

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
  status: ProcessingStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  questions: {
    content: string;
    createdAt: string;
  }[];
  reflections: {
    content: string;
    createdAt: string;
  }[];
  clarifications: {
    content: string;
    createdAt: string;
  }[];
  queryPreparations: {
    query: string;
    createdAt: string;
  }[];
  searchResults: {
    url: string;
    createdAt: string;
  }[];
  crawlResults: {
    url: string;
    reliability: number;
    createdAt: string;
  }[];
  reviews: {
    chunkId: string;
    relevanceScore: number;
    createdAt: string;
  }[];
} 