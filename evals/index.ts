import OpenAI from "openai";
import fs from "fs";
import path from "path";
import dotenv from 'dotenv';
import { z, ZodType } from "zod";
import crypto from "crypto";
import { EvaluationSyncer } from "./syncer";
import { Evaluator } from "./evaluator";
import { Logger } from "./logger";

dotenv.config();

// Custom Error Types
class EvaluationError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'EvaluationError';
    }
}

class StorageError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'StorageError';
    }
}

type Evaluation = {
[key: string]: {
    criteria: Criteria,
    testData: TestData,
    schema: Schema,
    targetPrompt: TargetPrompt,
}
}

type EvaluationMetadata = {
[key: string]: {
    evaluations: [
        {
            eval_uuid: string,
            file_uuid: string,
            message: string,
            runs: {
                run_uuid: string,
                created_at: string,
            }[]
        }
    ]
}
}

type EvaluationHash = {
[key: string]: {
    criteria: string,
    testData: string,
    schema: string,
    targetPrompt: string,
}
}


type Criteria = {
name: string;
type: string;
model: string;
input: {
    role: string;
    content: string;
}[];
}

type TestData = {
input: {
    role: string;
    content: string;
}[];
}

type TargetPrompt = {
system: {
    role: string;
    content: string;
},
user: {
    role: string;
    content: string;
}
}

type Schema = {
type: string;
properties: {
    [key: string]: string;
};
required: string[];
}

const criteriaSchema: ZodType<Criteria[]> = z.array(z.object({
name: z.string(),
type: z.string(),
model: z.string(),
input: z.array(z.object({
    role: z.string(),
    content: z.string(),    
})),
}))

const testDataSchema: ZodType<TestData[]> = z.array(z.object({
input: z.array(z.object({
    role: z.string(),
    content: z.string(),    
})),
}))

const targetPromptSchema: ZodType<TargetPrompt> = z.object({  
system: z.object({
    role: z.string(),
    content: z.string(),
}),
user: z.object({
    role: z.string(),
    content: z.string(),
}),
})

const schemaSchema: ZodType<Schema> = z.object({
type: z.string(),   
properties: z.record(z.string(), z.string()),
required: z.array(z.string()),
})

class FileStorage {
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

class JSONFileStorage {
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
class EvaluationManager {
    private metadataConfigManager: MetadataConfigManager;
    private openai: OpenAI;

    constructor(directory: string, openai: OpenAI) {
        this.metadataConfigManager = new MetadataConfigManager(directory);
        this.openai = openai;
    }

    async initialize() {
        try {
            await this.metadataConfigManager.initialize();
            Logger.log('info', 'Evaluation manager initialized');
        } catch (error) {
            Logger.log('error', 'Failed to initialize evaluation manager', { error: error.message });
            throw new EvaluationError(
                `Failed to initialize: ${error.message}`,
                'INIT_ERROR'
            );
        }
    }

    getEvaluations() {
        return Object.keys(this.metadataConfigManager.getEvaluations());
    }

    async createEvaluation(evaluationName: string) {
        try {
            Logger.log('info', 'Creating evaluation', { evaluationName });
            const evaluation = this.metadataConfigManager.getEvaluation(evaluationName);
            
            const result = await this.openai.evals.create({
                name: "Socratic Generation",
                data_source_config: {
                    type: "custom",
                    item_schema: {
                        type: evaluation.schema.type,
                        properties: evaluation.schema.properties,
                        required: evaluation.schema.required
                    },
                    include_sample_schema: true,
                },
                testing_criteria: evaluation.criteria as any,
            });

            this.metadataConfigManager.addEvaluation(evaluationName, result.id);
            this.metadataConfigManager.setEvaluationHashes(evaluationName);
            
            Logger.log('info', 'Evaluation created successfully', { 
                evaluationName, 
                evaluationId: result.id 
            });
        } catch (error) {
            Logger.log('error', 'Failed to create evaluation', { 
                evaluationName, 
                error: error.message 
            });
            throw new EvaluationError(
                `Failed to create evaluation: ${error.message}`,
                'EVAL_CREATE_ERROR'
            );
        }
    }

    async createEvaluationRun(evaluationName: string) {
        try {
            Logger.log('info', 'Creating evaluation run', { evaluationName });
            const evaluationMetadata = this.metadataConfigManager.getLatestEvaluation(evaluationName);
            const evaluation = this.metadataConfigManager.getEvaluation(evaluationName);
            
            const run = await this.openai.evals.runs.create(evaluationMetadata.eval_uuid, {
                name: "Socratic Question Generation",
                data_source: {
                    type: "completions",
                    model: "gpt-4.1",
                    input_messages: {
                        type: "template",
                        template: [
                            { role: "developer", content: evaluation.targetPrompt.system.content },
                            { role: "user", content: evaluation.targetPrompt.user.content },
                        ],
                    },
                    source: { type: "file_id", id: evaluationMetadata.file_uuid },
                },
            });

            this.metadataConfigManager.addRun(evaluationName, run.id);
            Logger.log('info', 'Evaluation run created successfully', { 
                evaluationName, 
                runId: run.id 
            });
        } catch (error) {
            Logger.log('error', 'Failed to create evaluation run', { 
                evaluationName, 
                error: error.message 
            });
            throw new EvaluationError(
                `Failed to create evaluation run: ${error.message}`,
                'EVAL_RUN_CREATE_ERROR'
            );
        }
    }
}

class MetadataConfigManager {
    private readonly jsonFileStorage: JSONFileStorage;
    private evaluationsMetadata: EvaluationMetadata;
    private evaluationHashes: EvaluationHash;
    private evaluations: Evaluation;

    constructor(directory: string) {
        this.evaluationsMetadata = {};
        this.evaluationHashes = {};
        this.evaluations = {};
        this.jsonFileStorage = new JSONFileStorage(directory);
    }

    async initialize() {
        this.evaluationsMetadata = await this.jsonFileStorage.read("evaluations_metadata.json") as EvaluationMetadata;
        this.evaluationHashes = await this.jsonFileStorage.read("evaluation_hashes.json") as EvaluationHash;
        this.evaluations = await this.jsonFileStorage.read("evaluations.json") as Evaluation;
    }

    getContentHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    addRun(evaluation: string, run_uuid: string) {
        const evaluationMetadata = this.getLatestEvaluation(evaluation);
        evaluationMetadata.runs.push({
            run_uuid,
            created_at: new Date().toISOString(),
        })
    }

    addEvaluation(evaluation: string, eval_uuid: string, file_uuid: string = "", message: string = "") {
        const evaluationMetadata = this.getEvaluationMetaData(evaluation);
        evaluationMetadata.evaluations.push({
            eval_uuid,
            file_uuid,
            message,
            runs: [],
        })
    }

    setEvaluationHashes(evaluation: string) {
        const evaluationHashes = this.getEvaluationHashes(evaluation);
        for (const key of Object.keys(this.evaluations[evaluation])) {
            evaluationHashes[key] = this.getContentHash(this.evaluations[evaluation][key]);
        }
    }

    getEvaluationHashes(evaluation: string) {
        return this.evaluationHashes[evaluation];
    }

    getEvaluationMetaData(evaluation: string) {
        return this.evaluationsMetadata[evaluation];
    }

    getEvaluation(evaluation: string) {
        return this.evaluations[evaluation];
    }

    getEvaluations() {
        return Object.keys(this.evaluations);
    }

    getLatestEvaluation(evaluation: string) {
        return this.evaluationsMetadata[evaluation].evaluations[this.evaluationsMetadata[evaluation].evaluations.length - 1];
    }

    diff(evaluation: string): boolean {
        const evaluationHashes = this.getEvaluationHashes(evaluation);
        for (const key of Object.keys(this.evaluations[evaluation])) {
            if (key === "targetPrompt") {
                continue;
            }

            if (evaluationHashes[key] !== this.getContentHash(this.evaluations[evaluation][key])) {
                return true;
            }
        }
        return false;
    }

    async save() {
        await this.jsonFileStorage.write("evaluations_metadata.json", this.evaluationsMetadata);
        await this.jsonFileStorage.write("evaluation_hashes.json", this.evaluationHashes);
        await this.jsonFileStorage.write("evaluations.json", this.evaluations);
    }
}

export class EvaluationOrchestrator {
    private openai: OpenAI;
    private syncer: EvaluationSyncer;
    private evaluator: Evaluator;

    constructor(directory: string) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.syncer = new EvaluationSyncer(directory, this.openai);
        this.evaluator = new Evaluator(directory);
    }

    async syncAndRun(): Promise<boolean> {
        try {
            Logger.log('info', 'Starting evaluation sync and run');
            
            // First sync any changes
            const syncResult = await this.syncer.sync();
            if (!syncResult) {
                Logger.log('error', 'Sync failed, aborting run');
                return false;
            }

            // Then run evaluations
            const runResult = await this.evaluator.run();
            if (!runResult) {
                Logger.log('error', 'Run failed');
                return false;
            }

            Logger.log('info', 'Evaluation sync and run completed successfully');
            return true;
        } catch (error) {
            Logger.log('error', 'Failed to sync and run evaluations', { error: error.message });
            return false;
        }
    }
}

// Export all necessary types and classes
export * from './types';
export * from './errors';
export * from './logger';
export * from './storage';
export * from './metadata';
export * from './evaluation';
export * from './syncer';
export * from './evaluator';