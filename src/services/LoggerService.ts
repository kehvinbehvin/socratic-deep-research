import winston from 'winston';
import { join } from 'path';

// Custom log levels
export const LOG_LEVELS = {
  error: 0,    // Errors that need immediate attention
  warn: 1,     // Warning conditions
  info: 2,     // General information about system operation
  http: 3,     // HTTP request-specific logs
  debug: 4,    // Detailed information for debugging
  trace: 5     // Very detailed debugging information
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message}${metaStr ? `\n${metaStr}` : ''}`;
  })
);

// Custom format for file output (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

export class LoggerService {
  private static instance: LoggerService;
  private logger: winston.Logger;
  private logsDir: string;

  private constructor() {
    this.logsDir = join(process.cwd(), 'logs');
    this.logger = winston.createLogger({
      levels: LOG_LEVELS,
      level: process.env.LOG_LEVEL || 'info',
      transports: [
        // Console transport
        new winston.transports.Console({
          format: consoleFormat
        }),
        // Error log file
        new winston.transports.File({
          filename: join(this.logsDir, 'error.log'),
          level: 'error',
          format: fileFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        // Combined log file
        new winston.transports.File({
          filename: join(this.logsDir, 'combined.log'),
          format: fileFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });
  }

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    this.logger.log(level, message, meta);
  }

  error(message: string, meta?: Record<string, any>): void {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log('info', message, meta);
  }

  http(message: string, meta?: Record<string, any>): void {
    this.log('http', message, meta);
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.log('debug', message, meta);
  }

  trace(message: string, meta?: Record<string, any>): void {
    this.log('trace', message, meta);
  }
} 