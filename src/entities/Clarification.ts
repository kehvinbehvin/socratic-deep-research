import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import type { Reflection } from './Reflection';
import type { QueryPreparation } from '../types';

@Entity()
export class Clarification extends BaseEntity {
  @Column('simple-array')
  gaps: string[];

  @Column('simple-array')
  assumptions: string[];

  @Column('simple-array')
  newConcepts: string[];

  @Column('text')
  analysis: string;

  @ManyToOne('Reflection', 'clarifications')
  reflection: Reflection;

  @OneToMany('QueryPreparation', 'clarification')
  queryPreparations: QueryPreparation[];
} 