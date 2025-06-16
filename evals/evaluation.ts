import OpenAI from "openai";
import { MetadataConfigManager } from "./metadata";
import { Logger } from "./logger";
import { EvaluationError } from "./errors";

export class EvaluationManager {
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
        } catch (error: any) {
            Logger.log('error', 'Failed to initialize evaluation manager', { error: error.message });
            throw new EvaluationError(
                `Failed to initialize: ${error.message}`,
                'INIT_ERROR'
            );
        }
    }

    getEvaluations() {
        const evaluations = this.metadataConfigManager.getEvaluations();
        // Filter out any empty or invalid evaluation names
        return evaluations.filter(evalName => evalName && typeof evalName === 'string' && evalName.trim() !== '');
    }

    async createEvaluation(evaluationName: string) {
        if (!evaluationName || typeof evaluationName !== 'string' || evaluationName.trim() === '') {
            throw new EvaluationError('Invalid evaluation name', 'INVALID_EVAL_NAME');
        }

        try {
            Logger.log('info', 'Creating evaluation', { evaluationName });
            const evaluation = this.metadataConfigManager.getEvaluation(evaluationName);
            if (!evaluation) {
                throw new EvaluationError(
                    `Evaluation ${evaluationName} not found`,
                    'EVAL_NOT_FOUND'
                );
            }
            
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
        } catch (error: any) {
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
        } catch (error: any) {
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