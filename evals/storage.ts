import fs from "fs";
import path from "path";
import { Logger } from "./logger";
import { StorageError } from "./errors";

export class FileStorage {
    private readonly directory: string;

    constructor(directory: string) {
        if (!directory) {
            throw new StorageError("Valid directory is required", "INVALID_DIRECTORY");
        }
        this.directory = directory;
    }

    async create(fileName: string, data: string): Promise<void> {
        try {
            if (!fs.existsSync(this.directory)) {
                fs.mkdirSync(this.directory, { recursive: true });
                Logger.log('debug', 'Created directory', { directory: this.directory });
            }
            
            const filePath = path.join(this.directory, fileName);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, data);
                Logger.log('info', 'Created file', { filePath });
            } else {
                Logger.log('debug', 'File already exists', { filePath });
            }
        } catch (error) {
            Logger.log('error', 'Failed to create file', { 
                directory: this.directory, 
                fileName, 
                error: error.message 
            });
            throw new StorageError(
                `Failed to create file: ${error.message}`,
                'FILE_CREATE_ERROR'
            );
        }
    }

    async read(fileName: string): Promise<string> {
        try {
            const filePath = path.join(this.directory, fileName);
            if (!fs.existsSync(this.directory) || !fs.existsSync(filePath)) {
                throw new StorageError(
                    `File does not exist: ${filePath}`,
                    'FILE_NOT_FOUND'
                );
            }

            const content = fs.readFileSync(filePath, "utf8");
            Logger.log('debug', 'Read file', { filePath });
            return content;
        } catch (error) {
            Logger.log('error', 'Failed to read file', { 
                directory: this.directory, 
                fileName, 
                error: error.message 
            });
            throw new StorageError(
                `Failed to read file: ${error.message}`,
                'FILE_READ_ERROR'
            );
        }
    }

    async write(fileName: string, data: string): Promise<void> {
        try {
            const filePath = path.join(this.directory, fileName);
            if (!fs.existsSync(this.directory) || !fs.existsSync(filePath)) {
                throw new StorageError(
                    `File does not exist: ${filePath}`,
                    'FILE_NOT_FOUND'
                );
            }

            fs.writeFileSync(filePath, data);
            Logger.log('info', 'Updated file', { filePath });
        } catch (error) {
            Logger.log('error', 'Failed to write file', { 
                directory: this.directory, 
                fileName, 
                error: error.message 
            });
            throw new StorageError(
                `Failed to write file: ${error.message}`,
                'FILE_WRITE_ERROR'
            );
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