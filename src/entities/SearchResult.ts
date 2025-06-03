import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import type { QueryPreparation, CrawlResult } from '../types';

@Entity()
export class SearchResult extends BaseEntity {
  @Column('jsonb')
  results: {
    url: string;
    title: string;
    snippet: string;
    rank: number;
  }[];

  @ManyToOne('QueryPreparation', 'searchResults')
  queryPreparation: QueryPreparation;

  @OneToMany('CrawlResult', 'searchResult')
  crawlResults: CrawlResult[];
} 