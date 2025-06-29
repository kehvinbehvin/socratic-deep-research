import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';

@Entity()
export class QueryPreparation extends BaseEntity {
  @Column('text')
  query: string;

  @Column('text')
  keyword: string;

  @ManyToOne(() => Topic, topic => topic.queryPreparations)
  topic: Topic;
} 