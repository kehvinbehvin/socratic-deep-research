// Core properties every queue message needs
interface QueueDTOCore {
  id: string;
  topicId: string;
  status: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Track IDs from previous stages
interface StageIds {
  questions?: string[];
  reflections?: string[];
  clarifications?: string[];
  queryPreparations?: string[];
  searchResults?: string[];
  crawlResults?: string[];
  reviews?: string[];
}

// Generic queue DTO
export interface GenericQueueDTO<T = unknown> {
  core: QueueDTOCore;
  previousStages: StageIds;
  currentStage: T;
}

// Stage-specific data interfaces
export interface TopicStageData {
  title: string;
  description: string;
}

export interface QuestionStageData {
  questions: string[];
}

export interface ReflectionStageData {
  reflections: string[];
}

export interface ClarificationStageData {
  clarifications: string[];
}

export interface QueryPreparationStageData {
  queries: string[];
  keywords: string[];
}

export interface SearchResultStageData {
  searchResults: string[];
}

export interface CrawlResultStageData {
  crawlResults: string[];
}

export interface ReviewStageData {
  reviews: string[];
}

export interface CompleteStageData {
  complete: string[];
}

export type QueueTopicDTO = GenericQueueDTO<TopicStageData>;
export type QueueQuestionDTO = GenericQueueDTO<QuestionStageData>;
export type QueueReflectionDTO = GenericQueueDTO<ReflectionStageData>;
export type QueueClarificationDTO = GenericQueueDTO<ClarificationStageData>;
export type QueueQueryPreparationDTO = GenericQueueDTO<QueryPreparationStageData>;
export type QueueSearchResultDTO = GenericQueueDTO<SearchResultStageData>;
export type QueueCrawlResultDTO = GenericQueueDTO<CrawlResultStageData>;
export type QueueReviewDTO = GenericQueueDTO<ReviewStageData>;
export type QueueCompleteDTO = GenericQueueDTO<CompleteStageData>;