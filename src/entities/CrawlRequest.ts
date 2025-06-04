import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';

@Entity()
export class CrawlRequest extends BaseEntity {
  @Column('text')
  url: string;

  @ManyToOne(() => Topic, topic => topic.crawlRequests)
  topic: Topic;

  @Column('text')
  fireCrawlId: string;
} 