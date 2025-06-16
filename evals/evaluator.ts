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

    async run(): Promise<boolean> {
        try {
            // Loop through all evaluations and trigger a new run
            for (const evaluation of this.evaluationManager.getEvaluations()) {
                await this.evaluationManager.createEvaluationRun(evaluation);
            }

            return true;
        } catch (error) {
            Logger.log('error', 'Failed to run evaluations', { error: error.message });
            return false;
        }
    }
} 