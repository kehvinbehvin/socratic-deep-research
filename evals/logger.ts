export class Logger {
    static log(level: 'info' | 'error' | 'debug', message: string, meta?: any) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...meta
        };
        
        switch(level) {
            case 'error':
                console.error(JSON.stringify(logEntry));
                break;
            case 'debug':
                console.debug(JSON.stringify(logEntry));
                break;
            default:
                console.log(JSON.stringify(logEntry));
        }
    }
} 