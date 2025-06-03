import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';

@Entity()
export class CrawlResult extends BaseEntity {
  @Column('text')
  url: string;

  @ManyToOne(() => Topic, topic => topic.searchResults)
  topic: Topic;
} 