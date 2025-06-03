import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { CrawlResult } from './CrawlResult';

interface ReliabilityAssessment {
  score: number;
  reasoning: string;
  credibilityFactors: string[];
  potentialBiases: string[];
}

interface ReviewResultItem {
  url: string;
  title?: string;
  reliability?: ReliabilityAssessment;
  relevantChunks?: Array<{
    content: string;
    relevanceScore: number;
  }>;
  error?: string;
  success: boolean;
}

@Entity()
export class Review extends BaseEntity {
  @Column('jsonb')
  results: ReviewResultItem[];

  @ManyToOne(() => CrawlResult, crawlResult => crawlResult.reviews)
  crawlResult: CrawlResult;

  @Column('uuid')
  crawlResultId: string;
} 