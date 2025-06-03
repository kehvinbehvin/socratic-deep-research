import { DataSource } from 'typeorm';
import { 
  Topic,
  Question,
  Reflection,
  Clarification,
  QueryPreparation,
  SearchResult,
  CrawlResult,
  Review
} from '../entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'myapp',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  entities: [
    Topic,
    Question,
    Reflection,
    Clarification,
    QueryPreparation,
    SearchResult,
    CrawlResult,
    Review
  ],
  migrations: ['src/migrations/*.ts'],
}); 