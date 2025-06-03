import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import type { SearchResult, Review } from '../types';
import { SearchResult as SearchResultEntity } from './SearchResult';

interface S3Link {
  url: string;
  s3Key: string;
  status: 'completed' | 'failed';
}

@Entity()
export class CrawlResult extends BaseEntity {
  @ManyToOne(() => SearchResultEntity, { eager: true })
  searchResult: SearchResultEntity;

  @Column('jsonb')
  s3Links: S3Link[];

  @OneToMany('Review', 'crawlResult')
  reviews: Review[];
} 