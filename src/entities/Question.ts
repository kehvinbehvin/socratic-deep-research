import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';
import { Reflection } from './Reflection';

@Entity()
export class Question extends BaseEntity {
  @Column('text')
  content: string;

  @Column('text')
  followUpQuestions: string;

  @ManyToOne(() => Topic, topic => topic.questions)
  topic: Topic;

  @OneToMany(() => Reflection, reflection => reflection.question)
  reflections: Reflection[];
} 