export class EvaluationError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'EvaluationError';
    }
}

export class StorageError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'StorageError';
    }
} 