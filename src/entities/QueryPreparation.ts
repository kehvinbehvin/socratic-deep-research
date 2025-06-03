import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Clarification } from './Clarification';
import { SearchResult } from './SearchResult';

@Entity()
export class QueryPreparation extends BaseEntity {
  @Column('text')
  searchQueries: string;

  @Column('text')
  keywords: string;

  @ManyToOne(() => Clarification, clarification => clarification.queryPreparations)
  clarification: Clarification;

  @OneToMany(() => SearchResult, searchResult => searchResult.queryPreparation)
  searchResults: SearchResult[];
} 