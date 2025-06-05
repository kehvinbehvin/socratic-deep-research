import { Entity, Column, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';
import { CrawlResult } from './CrawlResult';

@Entity()
export class Page extends BaseEntity {
  @Column()
  url: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  publishedDate?: string;

  @Column({ nullable: true })
  author?: string;

  @Column()
  domain: string;

  @Column()
  contentLength: number;

  @Column()
  s3Key: string;

  @Column({ nullable: true })
  lastModified?: string;

  @Column({ nullable: true })
  language?: string;

  @Column({ nullable: true })
  contentType?: string;

  @Column({ nullable: true })
  sourceUrl?: string;

  @Column({ nullable: true })
  scrapeId?: string;

  @ManyToOne(() => Topic, { nullable: false })
  topic: Topic;

  @OneToOne(() => CrawlResult, result => result.page)
  @JoinColumn()
  crawlResult: CrawlResult;
} 