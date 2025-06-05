import { Entity, Column, ManyToOne, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';
import { Review } from './Review';
import { Page } from './Page';

@Entity()
export class CrawlResult extends BaseEntity {
  @Column()
  url: string;

  @Column('decimal', { precision: 4, scale: 2 })
  reliability: number;

  @ManyToOne(() => Topic, { nullable: false })
  topic: Topic;

  @OneToOne(() => Page, page => page.crawlResult)  
  page: Page;

  @OneToMany(() => Review, review => review.crawlResult, {
    cascade: ['insert', 'update']
  }) 
  reviews: Review[];
} 