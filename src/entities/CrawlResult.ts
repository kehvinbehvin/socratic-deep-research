import { Entity, Column, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';
import { Review } from './Review';

@Entity()
export class CrawlResult extends BaseEntity {
  @Column('text')
  url: string;

  @ManyToOne(() => Topic, topic => topic.searchResults)
  topic: Topic;

  @Column('int')
  reliability: number;

  @OneToOne(() => Review, review => review.crawlResult, { nullable: true })
  review: Review;
} 