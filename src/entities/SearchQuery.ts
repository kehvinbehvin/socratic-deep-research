import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { QueryPreparation } from './QueryPreparation';
import { SearchResult } from './SearchResult';

@Entity()
export class SearchQuery extends BaseEntity {
  @Column('simple-array')
  queries: string[];

  @Column('simple-array')
  keywords: string[];

  @Column('text')
  reasoning: string;

  @ManyToOne(() => QueryPreparation, queryPreparation => queryPreparation.searchQueries)
  queryPreparation: QueryPreparation;

  @Column('uuid')
  queryPreparationId: string;

  @OneToMany(() => SearchResult, searchResult => searchResult.searchQuery)
  searchResults: SearchResult[];
} 