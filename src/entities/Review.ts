import { Entity, Column, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import type { CrawlResult, Topic } from '../types';

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

  @OneToOne('Topic', 'review')
  topic: Topic;
} 