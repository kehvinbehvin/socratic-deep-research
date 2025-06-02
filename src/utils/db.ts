import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Message } from '../entities/Message';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: true, // Be careful with this in production
  logging: true,
  entities: [Message],
  subscribers: [],
  migrations: [],
  connectTimeoutMS: 10000
});

let initialized = false;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const initializeDatabase = async () => {
  if (!initialized) {
    let retries = 5;
    while (retries > 0) {
      try {
        await AppDataSource.initialize();
        console.log('Database connection initialized successfully');
        initialized = true;
        break;
      } catch (error) {
        console.error(`Failed to initialize database connection. Retries left: ${retries}`, error);
        retries--;
        if (retries === 0) {
          throw error;
        }
        await sleep(3000); // Wait 3 seconds before retrying
      }
    }
  }
  return AppDataSource;
}; 