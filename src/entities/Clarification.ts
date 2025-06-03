import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Reflection } from './Reflection';
import { QueryPreparation } from './QueryPreparation';

@Entity()
export class Clarification extends BaseEntity {
  @Column('text')
  clarifyingQuestions: string;

  @Column('text')
  suggestions: string;

  @ManyToOne(() => Reflection, reflection => reflection.clarifications)
  reflection: Reflection;

  @OneToMany(() => QueryPreparation, queryPreparation => queryPreparation.clarification)
  queryPreparations: QueryPreparation[];
} 