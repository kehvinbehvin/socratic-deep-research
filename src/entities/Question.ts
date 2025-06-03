import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';
import { Reflection } from './Reflection';

@Entity()
export class Question extends BaseEntity {
  @Column()
  content: string;

  @Column({ type: 'uuid' })
  topicId: string;

  @ManyToOne(() => Topic, topic => topic.questions)
  @JoinColumn({ name: 'topicId' })
  topic: Topic;

  @OneToMany(() => Reflection, reflection => reflection.question)
  reflections: Reflection[];

  @Column({ type: 'text', nullable: true })
  followUpQuestions?: string;
} 