import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Question } from './Question';
import { Reflection } from './Reflection';
import { Clarification } from './Clarification';
import { QueryPreparation } from './QueryPreparation';
import { SearchQuery } from './SearchQuery';
import { SearchResult } from './SearchResult';

@Entity()
export class Topic extends BaseEntity {
  @Column('text')
  content: string;

  @OneToMany(() => Question, question => question.topic)
  questions: Question[];

  @OneToMany(() => Reflection, reflection => reflection.topic)
  reflections: Reflection[];

  @OneToMany(() => Clarification, clarification => clarification.topic)
  clarifications: Clarification[];

  @OneToMany(() => QueryPreparation, queryPreparation => queryPreparation.topic)
  queryPreparations: QueryPreparation[];

  @OneToMany(() => SearchQuery, searchQuery => searchQuery.topic)
  searchQueries: SearchQuery[];

  @OneToMany(() => SearchResult, searchResult => searchResult.topic)
  searchResults: SearchResult[];
} 