import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import type { Question } from '../types';

@Entity()
export class Topic extends BaseEntity {
  @Column('text')
  content: string;

  @OneToMany('Question', 'topic')
  questions: Question[];
} 