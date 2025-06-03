import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { SearchQuery } from './SearchQuery';
import { CrawlResult } from './CrawlResult';

interface SearchResultItem {
  url: string;
  title: string;
  snippet: string;
  rank: number;
}

@Entity()
export class SearchResult extends BaseEntity {
  @Column('jsonb')
  results: SearchResultItem[];

  @ManyToOne(() => SearchQuery, searchQuery => searchQuery.searchResults)
  searchQuery: SearchQuery;

  @Column('uuid')
  searchQueryId: string;

  @OneToMany(() => CrawlResult, crawlResult => crawlResult.searchResult)
  crawlResults: CrawlResult[];
} 