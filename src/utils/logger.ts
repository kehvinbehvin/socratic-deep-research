export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: Record<string, any>): void {
    console.log(JSON.stringify({
      level: 'info',
      context: this.context,
      message,
      ...data,
      timestamp: new Date().toISOString()
    }));
  }

  error(message: string, data?: Record<string, any>): void {
    console.error(JSON.stringify({
      level: 'error',
      context: this.context,
      message,
      ...data,
      timestamp: new Date().toISOString()
    }));
  }

  debug(message: string, data?: Record<string, any>): void {
    if (process.env.DEBUG) {
      console.debug(JSON.stringify({
        level: 'debug',
        context: this.context,
        message,
        ...data,
        timestamp: new Date().toISOString()
      }));
    }
  }
} 