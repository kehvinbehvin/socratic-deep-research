import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Reflection } from './Reflection';
import { QueryPreparation } from './QueryPreparation';

@Entity()
export class Clarification extends BaseEntity {
  @Column()
  content: string;

  @Column({ type: 'uuid' })
  reflectionId: string;

  @ManyToOne(() => Reflection, reflection => reflection.clarifications)
  @JoinColumn({ name: 'reflectionId' })
  reflection: Reflection;

  @Column({ type: 'text', nullable: true })
  clarifyingQuestions?: string;

  @Column({ type: 'text', nullable: true })
  suggestions?: string;

  @OneToMany(() => QueryPreparation, queryPreparation => queryPreparation.clarification)
  queryPreparations: QueryPreparation[];
} 