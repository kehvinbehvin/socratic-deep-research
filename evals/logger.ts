export class Logger {
    static log(level: 'info' | 'error' | 'debug' | 'warn', message: string, data?: any) {
        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            level,
            message,
            ...data
        };
        console.log(JSON.stringify(logData));
    }
} 