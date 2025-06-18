import fs from "fs";
import path from "path";
import { EvaluationLogger as Logger } from "./EvaluationLogger";
import { StorageError } from "./errors";

class FileStorage {
    private readonly directory: string;
    private readonly lockFile: string;

    constructor(directory: string) {
        if (!directory) {
            throw new StorageError("Valid directory is required", "INVALID_DIRECTORY");
        }
        this.directory = directory;
        this.lockFile = path.join(directory, '.lock');
    }

    private async acquireLock(): Promise<void> {
        const maxAttempts = 10;
        const delay = 1000; // 1 second

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                if (!fs.existsSync(this.lockFile)) {
                    fs.writeFileSync(this.lockFile, process.pid.toString());
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error: any) {
                Logger.log('warn', 'Failed to acquire lock', { error: error.message });
            }
        }
        throw new StorageError('Failed to acquire file lock', 'LOCK_ERROR');
    }

    private releaseLock(): void {
        try {
            if (fs.existsSync(this.lockFile)) {
                fs.unlinkSync(this.lockFile);
            }
        } catch (error: any) {
            Logger.log('warn', 'Failed to release lock', { error: error.message });
        }
    }

    async create(fileName: string, data: string): Promise<void> {
        try {
            await this.acquireLock();
            
            if (!fs.existsSync(this.directory)) {
                fs.mkdirSync(this.directory, { recursive: true });
                Logger.log('debug', 'Created directory', { directory: this.directory });
            }
            
            const filePath = path.join(this.directory, fileName);
            fs.writeFileSync(filePath, data);
            Logger.log('info', 'Created file', { filePath });
        } catch (error: any) {
            Logger.log('error', 'Failed to create file', { 
                directory: this.directory, 
                fileName, 
                error: error.message 
            });
            throw new StorageError(
                `Failed to create file: ${error.message}`,
                'FILE_CREATE_ERROR'
            );
        } finally {
            this.releaseLock();
        }
    }

    async read(fileName: string): Promise<string> {
        try {
            await this.acquireLock();
            
            const filePath = path.join(this.directory, fileName);
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(this.directory)) {
                fs.mkdirSync(this.directory, { recursive: true });
                Logger.log('debug', 'Created directory', { directory: this.directory });
            }

            // Create empty file if it doesn't exist
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, '{}');
                Logger.log('debug', 'Created empty file', { filePath });
            }

            const content = fs.readFileSync(filePath, "utf8");
            return content;
        } catch (error: any) {
            Logger.log('error', 'Failed to read file', { 
                directory: this.directory, 
                fileName, 
                error: error.message 
            });
            throw new StorageError(
                `Failed to read file: ${error.message}`,
                'FILE_READ_ERROR'
            );
        } finally {
            this.releaseLock();
        }
    }

    async write(fileName: string, data: string): Promise<void> {
        try {
            await this.acquireLock();
            
            const filePath = path.join(this.directory, fileName);
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(this.directory)) {
                fs.mkdirSync(this.directory, { recursive: true });
                Logger.log('debug', 'Created directory', { directory: this.directory });
            }

            // Create file if it doesn't exist
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, data);
                Logger.log('debug', 'Created file', { filePath });
            } else {
                fs.writeFileSync(filePath, data);
                Logger.log('info', 'Updated file', { filePath });
            }
        } catch (error: any) {
            Logger.log('error', 'Failed to write file', { 
                directory: this.directory, 
                fileName, 
                error: error.message 
            });
            throw new StorageError(
                `Failed to write file: ${error.message}`,
                'FILE_WRITE_ERROR'
            );
        } finally {
            this.releaseLock();
        }
    }
}

export class JSONFileStorage {
    private readonly fileStorage: FileStorage;

    constructor(directory: string) {
        this.fileStorage = new FileStorage(directory);
    }

    async create(fileName: string, data: object): Promise<void> {
        await this.fileStorage.create(fileName, JSON.stringify(data, null, 2));
    }

    async read(fileName: string): Promise<object> {
        return JSON.parse(await this.fileStorage.read(fileName));
    }

    async write(fileName: string, data: object): Promise<void> {
        await this.fileStorage.write(fileName, JSON.stringify(data, null, 2));
    }
} 