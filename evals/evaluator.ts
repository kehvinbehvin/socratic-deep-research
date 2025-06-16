import OpenAI from "openai";
import { EvaluationManager } from "./evaluation";
import { Logger } from "./logger";

export class Evaluator {
    private evaluationManager: EvaluationManager;
    private openai: OpenAI;

    constructor(directory: string) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.evaluationManager = new EvaluationManager(directory, this.openai);
    }

    async initialize(): Promise<void> {
        try {
            await this.evaluationManager.initialize();
            Logger.log('info', 'Evaluator initialized successfully');
        } catch (error: any) {
            Logger.log('error', 'Failed to initialize evaluator', { error: error.message });
            throw error;
        }
    }

    async run(): Promise<boolean> {
        try {
            const evaluations = this.evaluationManager.getEvaluations();
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