import { Entity, Column, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';
import { SearchResult } from './SearchResult';

@Entity()
export class Review extends BaseEntity {
  @Column('text')
  chunkId: string; // chunk id from vector db

  @Column('int32')
  relevance: number;

  @Column('int32')
  reliability: number;

  @ManyToOne(() => Topic, topic => topic.searchResults)
  topic: Topic;

  @OneToOne(() => SearchResult, searchResult => searchResult.review)
  searchResult: SearchResult;
} 