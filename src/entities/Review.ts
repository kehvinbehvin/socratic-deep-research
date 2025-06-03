import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import type { CrawlResult } from '../types';

@Entity()
export class Review extends BaseEntity {
  @Column('jsonb')
  sourceReliability: {
    score: number;
    reasoning: string;
  };

  @Column('jsonb')
  relevantChunks: {
    content: string;
    relevanceScore: number;
    vectorId: string;
  }[];

  @ManyToOne('CrawlResult', 'reviews')
  crawlResult: CrawlResult;
} 