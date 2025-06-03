import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import type { Topic, Reflection } from '../types';

@Entity()
export class Question extends BaseEntity {
  @Column('text')
  reasoning: string;

  @Column('simple-array')
  questions: string[];

  @ManyToOne('Topic', 'questions')
  topic: Topic;

  @OneToMany('Reflection', 'question')
  reflections: Reflection[];
} 