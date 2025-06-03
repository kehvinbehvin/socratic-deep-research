import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import type { Question, Clarification } from '../types';

@Entity()
export class Reflection extends BaseEntity {
  @Column('jsonb')
  reflections: {
    question: string;
    reflection: string;
    confidence: number;
  }[];

  @ManyToOne('Question', 'reflections')
  question: Question;

  @OneToMany('Clarification', 'reflection')
  clarifications: Clarification[];
} 