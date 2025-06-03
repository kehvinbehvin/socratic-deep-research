import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { QueryPreparation } from './QueryPreparation';

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

  @Column('text')
  analysis: string;

  @ManyToOne(() => QueryPreparation, queryPreparation => queryPreparation.searchResults)
  queryPreparation: QueryPreparation;
} 