import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity, ProcessingStatus } from './BaseEntity';
import { Clarification } from './Clarification';
import { SearchQuery } from './SearchQuery';

@Entity()
export class QueryPreparation extends BaseEntity {
  @Column('text')
  content: string;

  @ManyToOne(() => Clarification, clarification => clarification.queryPreparations)
  clarification: Clarification;

  @Column('uuid')
  clarificationId: string;

  @OneToMany(() => SearchQuery, searchQuery => searchQuery.queryPreparation)
  searchQueries: SearchQuery[];
} 