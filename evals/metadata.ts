import crypto from "crypto";
import { JSONFileStorage } from "./storage";
import { Logger } from "./logger";
import { Evaluation, EvaluationMetadata, EvaluationHash } from "./types";

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