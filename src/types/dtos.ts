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
interface GenericQueueDTO<T = unknown> {
  core: QueueDTOCore;
  previousStages: StageIds;
  currentStage: T;
}

// Stage-specific data interfaces
interface TopicStageData {
  title: string;
  description: string;
}

interface QuestionStageData {
  questions: string[];
}

interface ReflectionStageData {
  reflections: string[];
}

interface ClarificationStageData {
  clarifications: string[];
}

interface QueryPreparationStageData {
  queries: string[];
  keywords: string[];
}

interface SearchResultStageData {
  searchResults: string[];
}

interface CrawlResultStageData {
  crawlResults: string[];
}

interface ReviewStageData {
  reviews: string[];
}

export type QueueTopicDTO = GenericQueueDTO<TopicStageData>;
export type QueueQuestionDTO = GenericQueueDTO<QuestionStageData>;
export type QueueReflectionDTO = GenericQueueDTO<ReflectionStageData>;
export type QueueClarificationDTO = GenericQueueDTO<ClarificationStageData>;
export type QueueQueryPreparationDTO = GenericQueueDTO<QueryPreparationStageData>;
export type QueueSearchResultDTO = GenericQueueDTO<SearchResultStageData>;
export type QueueCrawlResultDTO = GenericQueueDTO<CrawlResultStageData>;
export type QueueReviewDTO = GenericQueueDTO<ReviewStageData>;