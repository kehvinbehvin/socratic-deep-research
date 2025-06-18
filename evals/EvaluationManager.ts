import OpenAI from "openai";
import { MetadataConfigManager } from "./metadata";
import { Logger } from "./logger";
import { EvaluationError } from "./errors";
import path from "path";
import fs from "fs";

export class EvaluationManager {
    private metadataConfigManager: MetadataConfigManager;
    private openai: OpenAI;

    constructor(metadataConfigManager: MetadataConfigManager, openai: OpenAI) {
        this.metadataConfigManager = metadataConfigManager;
        this.openai = openai;
    }

    async uploadTestData(evaluation: string): Promise<void> {
        try {
            Logger.log('info', 'Converting test data to JSONL', { evaluation });
            
            const evaluationData = this.metadataConfigManager.getEvaluation(evaluation);

            if (!evaluationData.testData || !Array.isArray(evaluationData.testData)) {
                throw new EvaluationError(
                    `No test data found for evaluation ${evaluation}`,
                    'NO_TEST_DATA'
                );
            }

            // Convert test data to JSONL format
            const jsonlContent = evaluationData.testData.map(testCase => {
                if (!testCase.input || !testCase.expected) {
                    throw new EvaluationError(
                        `Invalid test case format in evaluation ${evaluation}`,
                        'INVALID_TEST_CASE'
                    );
                }
                return JSON.stringify({
                    item: {
                        input: testCase.input,
                        expected: testCase.expected
                    }
                });
            }).join('\n');

            // Create temporary file
            const tempFilePath = path.join(process.cwd(), 'evals', 'files', `${evaluation}_test_data.jsonl`);
            await fs.promises.writeFile(tempFilePath, jsonlContent);

            // Upload to OpenAI
            Logger.log('info', 'Uploading test data to OpenAI', { evaluation });
            const file = await this.openai.files.create({
                file: fs.createReadStream(tempFilePath),
                purpose: "evals",
            });

            // Clean up temporary file
            await fs.promises.unlink(tempFilePath);

            this.metadataConfigManager.updateLatestEvaluationMetadata(evaluation, { file_uuid: file.id });

            Logger.log('info', 'Test data uploaded successfully', { 
                evaluation,
                fileId: file.id 
            });
        } catch (error: any) {
            Logger.log('error', 'Failed to upload test data', { 
                evaluation,
                error: error.message 
            });
            throw new EvaluationError(
                `Failed to upload test data: ${error.message}`,
                'UPLOAD_ERROR'
            );
        }
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
                name: `Socratic Generation (${evaluationName})`,
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

            console.log(result);

            await this.metadataConfigManager.addEvaluation(evaluationName, result.id);
            
            
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
            const evaluationMetadata = this.metadataConfigManager.getLatestEvaluationMetadata(evaluationName);
            const evaluation = this.metadataConfigManager.getEvaluation(evaluationName);

            if (!evaluationMetadata || !evaluationMetadata.file_uuid || !evaluationMetadata.eval_uuid) {
                throw new EvaluationError(
                    `No evaluation metadata found for evaluation ${evaluationName}`,
                    'NO_EVALUATION_METADATA'
                );
            }

            const run = await this.openai.evals.runs.create(evaluationMetadata.eval_uuid, {
                name: `Socratic Generation (${evaluationName})`,
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

            await this.metadataConfigManager.addRun(evaluationName, run.id);
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