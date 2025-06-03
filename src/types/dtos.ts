export interface TopicDTO {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  error?: string;
}

export interface QuestionDTO {
  id: string;
  reasoning: string;
  questions: string[];
  topicId: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  error?: string;
}

export interface ReflectionDTO {
  id: string;
  reflections: {
    question: string;
    reflection: string;
    confidence: number;
  }[];
  questionId: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  error?: string;
}

export interface ClarificationDTO {
  id: string;
  gaps: string[];
  assumptions: string[];
  newConcepts: string[];
  analysis: string;
  reflectionId: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  error?: string;
}

export interface QueryPreparationDTO {
  id: string;
  queries: {
    query: string;
    reasoning: string;
    priority: number;
  }[];
  clarificationId: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  error?: string;
}

export interface SearchResultDTO {
  id: string;
  results: {
    url: string;
    title: string;
    snippet: string;
    rank: number;
  }[];
  queryPreparationId: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  error?: string;
}

export interface CrawlResultDTO {
  id: string;
  s3Links: {
    url: string;
    s3Key: string;
    status: string;
  }[];
  searchResultId: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  error?: string;
}

export interface ReviewDTO {
  id: string;
  sourceReliability: {
    score: number;
    reasoning: string;
  };
  relevantChunks: {
    content: string;
    relevanceScore: number;
    vectorId: string;
  }[];
  crawlResultId: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  error?: string;
} 