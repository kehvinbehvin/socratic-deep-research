import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  message!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
} 