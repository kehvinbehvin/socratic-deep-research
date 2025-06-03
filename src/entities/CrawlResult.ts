import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { SearchResult } from './SearchResult';
import { Review } from './Review';

interface CrawlResultItem {
  url: string;
  title?: string;
  s3Key?: string;
  error?: string;
  success: boolean;
}

@Entity()
export class CrawlResult extends BaseEntity {
  @Column('jsonb')
  results: CrawlResultItem[];

  @ManyToOne(() => SearchResult, searchResult => searchResult.crawlResults)
  searchResult: SearchResult;

  @Column('uuid')
  searchResultId: string;

  @OneToMany(() => Review, review => review.crawlResult)
  reviews: Review[];
} 