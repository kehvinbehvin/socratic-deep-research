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

            // Only validate structure, don't reset data
            this.validateMetadataStructure();
            this.validateHashesStructure();
            this.validateEvaluationsStructure();

            Logger.log('info', 'Metadata initialized successfully');
        } catch (error: any) {
            Logger.log('error', 'Failed to initialize metadata', { error: error.message });
            throw new EvaluationError(
                `Failed to initialize metadata: ${error.message}`,
                'INIT_ERROR'
            );
        }
    }

    private validateMetadataStructure() {
        if (!this.evaluationsMetadata || typeof this.evaluationsMetadata !== 'object') {
            this.evaluationsMetadata = {};
        }
    }

    private validateHashesStructure() {
        if (!this.evaluationHashes || typeof this.evaluationHashes !== 'object') {
            this.evaluationHashes = {};
        }
    }

    private validateEvaluationsStructure() {
        if (!this.evaluations || typeof this.evaluations !== 'object') {
            this.evaluations = {};
        }
    }

    private getContentHash(content: any): string {
        return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
    }

    setEvaluationHashes(evaluation: string) {
        const evaluationHashes = this.getEvaluationHashes(evaluation);
        const validKeys: EvaluationKey[] = ['criteria', 'testData', 'schema', 'targetPrompt'];
        
        for (const key of validKeys) {
            if (key in this.evaluations[evaluation]) {
                evaluationHashes[key] = this.getContentHash(this.evaluations[evaluation][key]);
            }
        }
    }

    diff(evaluation: string): boolean {
        const evaluationHashes = this.getEvaluationHashes(evaluation);
        const validKeys: EvaluationKey[] = ['criteria', 'testData', 'schema', 'targetPrompt'];
        
        for (const key of validKeys) {
            if (key in this.evaluations[evaluation] && 
                evaluationHashes[key] !== this.getContentHash(this.evaluations[evaluation][key])) {
                return true;
            }
        }
        return false;
    }

    addRun(evaluation: string, run_uuid: string) {
        const evaluationMetadata = this.getLatestEvaluation(evaluation);
        evaluationMetadata.runs.push({
            run_uuid,
            created_at: new Date().toISOString(),
        });
    }

    addEvaluation(evaluation: string, eval_uuid: string, file_uuid: string = "", message: string = "") {
        const evaluationMetadata = this.getEvaluationMetaData(evaluation);
        evaluationMetadata.evaluations.push({
            eval_uuid,
            file_uuid,
            message,
            runs: [],
        });
    }

    getEvaluationHashes(evaluation: string) {
        if (!this.evaluationHashes[evaluation]) {
            this.evaluationHashes[evaluation] = {
                criteria: undefined,
                testData: undefined,
                schema: undefined,
                targetPrompt: undefined
            };
        }
        return this.evaluationHashes[evaluation];
    }

    getEvaluationMetaData(evaluation: string) {
        if (!this.evaluationsMetadata[evaluation]) {
            this.evaluationsMetadata[evaluation] = {
                evaluations: [{
                    eval_uuid: '',
                    file_uuid: '',
                    message: '',
                    runs: []
                }]
            };
        }
        return this.evaluationsMetadata[evaluation];
    }

    getEvaluation(evaluation: string) {
        return this.evaluations[evaluation];
    }

    getEvaluations() {
        return Object.keys(this.evaluations);
    }

    getLatestEvaluation(evaluation: string) {
        const metadata = this.getEvaluationMetaData(evaluation);
        if (!Array.isArray(metadata.evaluations) || metadata.evaluations.length === 0) {
            throw new EvaluationError(
                `No evaluations found for ${evaluation}`,
                'NO_EVALUATIONS'
            );
        }
        return metadata.evaluations[metadata.evaluations.length - 1];
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
        } catch (error: any) {
            Logger.log('error', 'Failed to save metadata', { error: error.message });
            throw new EvaluationError(
                `Failed to save metadata: ${error.message}`,
                'SAVE_ERROR'
            );
        }
    }
} 