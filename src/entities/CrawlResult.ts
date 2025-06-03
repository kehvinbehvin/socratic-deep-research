import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import type { SearchResult, Review } from '../types';

@Entity()
export class CrawlResult extends BaseEntity {
  @Column('jsonb')
  s3Links: {
    url: string;
    s3Key: string;
    status: string;
  }[];

  @ManyToOne('SearchResult', 'crawlResults')
  searchResult: SearchResult;

  @OneToMany('Review', 'crawlResult')
  reviews: Review[];
} 