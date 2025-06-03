import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';

@Entity()
export class Reflection extends BaseEntity {
  @Column()
  content: string;
  
  @ManyToOne(() => Topic, topic => topic.reflections)
  topic: Topic;
} 