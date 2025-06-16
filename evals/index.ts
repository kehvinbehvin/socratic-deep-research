import OpenAI from "openai";
import dotenv from 'dotenv';
import { EvaluationSyncer } from "./syncer";
import { Evaluator } from "./evaluator";
import { Logger } from "./logger";

dotenv.config();

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

if (require.main === module) {
    // Ensure required environment variables are set
    if (!process.env.OPENAI_API_KEY) {
      console.error('Please set OPENAI_API_KEY environment variable');
      process.exit(1);
    }
  
    const evaluationOrchestrator = new EvaluationOrchestrator(process.env.EVALUATION_DIR || './evals');

    evaluationOrchestrator.syncAndRun()
      .then(() => {
        console.log('\nEvaluation sync and run completed successfully');
        process.exit(0);
      })
      .catch(error => {
        console.error('\nEvaluation sync and run failed:', error);
        process.exit(1);
      });
  }