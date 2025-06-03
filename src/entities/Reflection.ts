import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Question } from './Question';
import { Clarification } from './Clarification';

@Entity()
export class Reflection extends BaseEntity {
  @Column()
  content: string;

  @Column({ type: 'uuid' })
  questionId: string;

  @ManyToOne(() => Question, question => question.reflections)
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @OneToMany(() => Clarification, clarification => clarification.reflection)
  clarifications: Clarification[];

  @Column({ type: 'text', nullable: true })
  analysis?: string;
} 