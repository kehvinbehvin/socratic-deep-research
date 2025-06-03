import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Question } from './Question';
import { Clarification } from './Clarification';

@Entity()
export class Reflection extends BaseEntity {
  @Column('text')
  content: string;

  @Column('text')
  analysis: string;

  @ManyToOne(() => Question, question => question.reflections)
  question: Question;

  @OneToMany(() => Clarification, clarification => clarification.reflection)
  clarifications: Clarification[];
} 