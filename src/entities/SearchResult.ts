import { Entity, Column, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';
import { Review } from './Review';
import { nullable } from 'zod';

@Entity()
export class SearchResult extends BaseEntity {
  @Column('text')
  url: string;
  
  @ManyToOne(() => Topic, topic => topic.searchResults)
  topic: Topic;  
} 