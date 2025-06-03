import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';
import { Reflection } from './Reflection';

@Entity()
export class Question extends BaseEntity {
  @Column()
  content: string;

  @ManyToOne(() => Topic, topic => topic.questions)
  topic: Topic;
} 