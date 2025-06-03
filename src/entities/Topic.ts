import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Question } from './Question';
import { Reflection } from './Reflection';
import { Clarification } from './Clarification';
import { QueryPreparation } from './QueryPreparation';
import { SearchResult } from './SearchResult';
import { CrawlResult } from './CrawlResult';
import { Review } from './Review';

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

  @OneToMany(() => SearchResult, searchResult => searchResult.topic)
  searchResults: SearchResult[];

  @OneToMany(() => CrawlResult, crawlResult => crawlResult.topic)
  crawlResults: CrawlResult[];

  @OneToMany(() => Review, review => review.topic)
  reviews: Review[];
} 