import { EvaluationManager } from "./evaluation";
import { Logger } from "./logger";
import { EvaluationError } from "./errors";
import crypto from 'crypto';
import { MetadataConfigManager } from "./metadata";

export class Evaluator {
    private evaluationManager: EvaluationManager;
    private metadataConfigManager: MetadataConfigManager;

    constructor(evaluationManager: EvaluationManager, metadataConfigManager: MetadataConfigManager) {
        this.evaluationManager = evaluationManager;
        this.metadataConfigManager = metadataConfigManager;
    }

    getContentHash(content: any): string {
        return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
    }

    async initializeNewEvaluations(): Promise<void> {
        try {
            Logger.log('info', 'Initializing new evaluations');
            
            for (const evalName of this.metadataConfigManager.getEvaluationNames()) {
                const evaluationHashes = this.metadataConfigManager.getEvaluationHashes(evalName);
                if (evaluationHashes) {
                    Logger.log('debug', 'Hash already exists for evaluation', { evaluation: evalName });
                    continue;
                }

                await this.metadataConfigManager.setEvaluationHashes(evalName);
                Logger.log('info', 'Set evaluation hashes', { evaluation: evalName });
            }

            for (const evalName of this.metadataConfigManager.getEvaluationNames()) {
                const evaluationMetadata = this.metadataConfigManager.getLatestEvaluationMetadata(evalName);
                if (evaluationMetadata) {
                    Logger.log('error', 'Evaluation metadata already exists for evaluation', { evaluation: evalName });
                    continue;
                }

                await this.metadataConfigManager.createNewEvaluationMetadata(evalName);
                Logger.log('info', 'Created new evaluation metadata', { evaluation: evalName });

                await this.evaluationManager.uploadTestData(evalName);
                Logger.log('info', 'Uploaded test data for evaluation', { evaluation: evalName });

                await this.evaluationManager.createEvaluation(evalName);
                Logger.log('info', 'Created new evaluation', { evaluation: evalName });
            }

            Logger.log('info', 'New evaluations initialization completed');
        } catch (error: any) {
            Logger.log('error', 'Failed to initialize new evaluations', { error: error.message });
            throw new EvaluationError(
                `Failed to initialize new evaluations: ${error.message}`,
                'INIT_ERROR'
            );
        }
    } 

    async runEvaluations(): Promise<boolean> {
        try {
            const evaluations = this.metadataConfigManager.getEvaluationNames();
            if (evaluations.length === 0) {
                Logger.log('warn', 'No evaluations found to run');
                return true;
            }

            // Loop through all evaluations and trigger a new run
            for (const evaluation of evaluations) {
                if (!evaluation) {
                    Logger.log('warn', 'Skipping empty evaluation name');
                    continue;
                }
                
                Logger.log('info', 'Running evaluation', { evaluation });
                try {
                    await this.evaluationManager.createEvaluationRun(evaluation);
                } catch (error: any) {
                    Logger.log('error', 'Failed to run evaluation', { 
                        evaluation, 
                        error: error.message 
                    });
                    // Continue with other evaluations even if one fails
                    continue;
                }
            }

            return true;
        } catch (error: any) {
            Logger.log('error', 'Failed to run evaluations', { error: error.message });
            return false;
        }
    }
} 