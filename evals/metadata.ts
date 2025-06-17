import crypto from "crypto";
import { JSONFileStorage } from "./storage";
import { Logger } from "./logger";
import { Evaluation, EvaluationMetadata, EvaluationHash } from "./types";
import { EvaluationError } from "./errors";

type EvaluationKey = 'criteria' | 'testData' | 'schema' | 'targetPrompt';

export class MetadataConfigManager {
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
        try {
            // Read existing files
            const metadata = await this.jsonFileStorage.read("evaluations_metadata.json");
            const hashes = await this.jsonFileStorage.read("evaluation_hashes.json");
            const evaluations = await this.jsonFileStorage.read("evaluations.json");

            // Initialize with existing data or empty objects
            this.evaluationsMetadata = (metadata || {}) as EvaluationMetadata;
            this.evaluationHashes = (hashes || {}) as EvaluationHash;
            this.evaluations = (evaluations || {}) as Evaluation;

            Logger.log('info', 'Metadata initialized successfully');
        } catch (error: any) {
            Logger.log('error', 'Failed to initialize metadata', { error: error.message });
            throw new EvaluationError(
                `Failed to initialize metadata: ${error.message}`,
                'INIT_ERROR'
            );
        }
    }

    private getContentHash(content: any): string {
        return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
    }

    getEvaluationHashes(evaluation: string) {
        if (!this.evaluationHashes[evaluation]) {
            Logger.log('info', 'No evaluation hashes found for evaluation', { evaluation });
            return null;
        }

        return this.evaluationHashes[evaluation];
    }

    async setEvaluationHashes(evaluation: string) {
        const validKeys: EvaluationKey[] = ['criteria', 'testData', 'schema', 'targetPrompt'];
        this.evaluationHashes[evaluation] = {};

        for (const key of validKeys) {
            this.evaluationHashes[evaluation][key] = this.getContentHash(this.evaluations[evaluation][key]);
        }

        await this.save();
        return;
    }

    // Check if the evaluation has changed
    diff(evaluation: string): boolean {
        const evaluationHashes = this.getEvaluationHashes(evaluation);
        if (!evaluationHashes) {
            Logger.log('info', 'No evaluation hashes found for evaluation', { evaluation });
            return true;
        }

        const triggerKeys: EvaluationKey[] = ['criteria', 'testData', 'schema'];
        
        for (const key of triggerKeys) {
            if (key in this.evaluations[evaluation] && 
                evaluationHashes[key] !== this.getContentHash(this.evaluations[evaluation][key])) {
                return true;
            }
        }
        
        return false;
    }

    // To be called after a new run is created for the same evaluation
    async addRun(evaluation: string, run_uuid: string) {
        const evaluationMetadata = this.getLatestEvaluationMetadata(evaluation);
        if (!evaluationMetadata) {
            Logger.log('error', 'No evaluation metadata found for evaluation', { evaluation });
            return;
        }

        evaluationMetadata.runs.push({
            run_uuid,
            created_at: new Date().toISOString(),
        });

        await this.save();
    }

    // To be called after a new evaluation is created
    async addEvaluation(evaluation: string, eval_uuid: string, message: string = "") {
        const evaluationMetadata = this.getEvaluationMetaData(evaluation);
        if (!evaluationMetadata) {
            Logger.log('error', 'No evaluation metadata found for evaluation', { evaluation });
            return;
        }

        const latestEvaluation = evaluationMetadata.evaluations[evaluationMetadata.evaluations.length - 1];
        
        evaluationMetadata.evaluations.push({
            eval_uuid,
            file_uuid: latestEvaluation.file_uuid,
            message,
            runs: [],
        });
        await this.save();

        await this.setEvaluationHashes(evaluation);

        await this.save();
    }

    // Return user defined evaluations
    getEvaluation(evaluation: string) {
        return this.evaluations[evaluation];
    }

    // Return all evaluation names
    getEvaluationNames(): string[] {
        return Object.keys(this.evaluations);
    }

    // Return the entire evaluation metadata for a given evaluation
    getEvaluationMetaData(evaluation: string) {
        if (!this.evaluationsMetadata[evaluation]) {
            Logger.log('error', 'No evaluation metadata found for evaluation', { evaluation });
            return null;
        }

        return this.evaluationsMetadata[evaluation];
    }

    // Return the latest evaluation metadata for a given evaluation
    getLatestEvaluationMetadata(evaluation: string) {
        const metadata = this.getEvaluationMetaData(evaluation);
        if (!metadata) {
            Logger.log('info', 'No evaluation metadata found for evaluation', { evaluation });
            return null;
        }

        return metadata.evaluations[metadata.evaluations.length - 1];
    }
    
    async createNewEvaluationMetadata(evaluation: string) {
        this.evaluationsMetadata[evaluation] = {
            evaluations: [
                {
                    file_uuid: "",
                    eval_uuid: "",
                    message: "",
                    runs: []
                }
            ]
        };

        await this.save();
    }

    async updateLatestEvaluationMetadata(evaluation: string, record: Record<string, any>) {
        const latestEvaluation = this.getLatestEvaluationMetadata(evaluation);
        if (!latestEvaluation) {
            Logger.log('error', 'No latest evaluation metadata found for evaluation', { evaluation });
            return;
        }

        for (const key in record) {
            (latestEvaluation as any)[key] = record[key];
        }

        await this.save();
    }

    async save() {
        try {
            // Read existing data first
            const existingMetadata = await this.jsonFileStorage.read("evaluations_metadata.json") as EvaluationMetadata;
            const existingHashes = await this.jsonFileStorage.read("evaluation_hashes.json") as EvaluationHash;
            const existingEvaluations = await this.jsonFileStorage.read("evaluations.json") as Evaluation;

            // Merge existing data with new data
            const mergedMetadata = { ...existingMetadata, ...this.evaluationsMetadata };
            const mergedHashes = { ...existingHashes, ...this.evaluationHashes };
            const mergedEvaluations = { ...existingEvaluations, ...this.evaluations };

            // Save merged data
            await this.jsonFileStorage.write("evaluations_metadata.json", mergedMetadata);
            await this.jsonFileStorage.write("evaluation_hashes.json", mergedHashes);
            await this.jsonFileStorage.write("evaluations.json", mergedEvaluations);

            Logger.log('info', 'Metadata saved successfully');

            await this.initialize();
            Logger.log('info', 'Metadata cache updated successfully');
        } catch (error: any) {
            Logger.log('error', 'Failed to save metadata', { error: error.message });
            throw new EvaluationError(
                `Failed to save metadata: ${error.message}`,
                'SAVE_ERROR'
            );
        }
    }
} 