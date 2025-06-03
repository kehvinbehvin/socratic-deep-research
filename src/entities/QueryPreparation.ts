import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import type { Clarification, SearchResult } from '../types';

@Entity()
export class QueryPreparation extends BaseEntity {
  @Column('jsonb')
  queries: {
    query: string;
    reasoning: string;
    priority: number;
  }[];

  @ManyToOne('Clarification', 'queryPreparations')
  clarification: Clarification;

  @OneToMany('SearchResult', 'queryPreparation')
  searchResults: SearchResult[];
} 