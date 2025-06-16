import OpenAI from "openai";
import { EvaluationManager } from "./evaluation";
import { MetadataConfigManager } from "./metadata";
import { Logger } from "./logger";

export class EvaluationSyncer {
    private evaluationManager: EvaluationManager;
    private metadataConfigManager: MetadataConfigManager;

    constructor(directory: string, openai: OpenAI) {
        this.evaluationManager = new EvaluationManager(directory, openai);
        this.metadataConfigManager = new MetadataConfigManager(directory);
    }

    async sync(): Promise<boolean> {
        try {
            // Loop through all evaluations.
            // for each evaluation, check for changes in the criteria, test data, schema, and target prompt.
            // if there are changes, create a new evaluation and update the metadata and hashes.
            // if there are no changes, use the existing evaluation and trigger a new run.
            for (const evaluation of this.evaluationManager.getEvaluations()) {
                if (this.metadataConfigManager.diff(evaluation)) {
                    await this.evaluationManager.createEvaluation(evaluation);
                } else {
                    await this.evaluationManager.createEvaluationRun(evaluation);
                }
            }

            return true;
        } catch (error: any) {
            Logger.log('error', 'Failed to sync evaluations', { error: error.message });
            return false;
        } finally {
            await this.metadataConfigManager.save();
        }
    }
} 