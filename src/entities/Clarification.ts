import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';

@Entity()
export class Clarification extends BaseEntity {
  @Column()
  content: string;

  @ManyToOne(() => Topic, topic => topic.questions)
  topic: Topic;
} 