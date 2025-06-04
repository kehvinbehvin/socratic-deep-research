import { Entity, Column, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';
import { CrawlResult } from './CrawlResult';

@Entity()
export class Review extends BaseEntity {
  @Column('text')
  chunkId: string; // chunk id from vector db

  @Column('text')
  content: string;

  @Column('decimal', { precision: 4, scale: 2 })
  relevance: number; 

  @ManyToOne(() => Topic, topic => topic.crawlResults)
  topic: Topic;

  @OneToOne(() => CrawlResult, crawlResult => crawlResult.review)
  @JoinColumn()
  crawlResult: CrawlResult;
} 