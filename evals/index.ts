import OpenAI from "openai";
import dotenv from 'dotenv';
import { EvaluationSyncer } from "./syncer";
import { Evaluator } from "./evaluator";
import { EvaluationManager } from "./evaluation";
import { MetadataConfigManager } from "./metadata";
import { EvaluationSystem } from "./EvaluationSystem";

dotenv.config();

if (require.main === module) {
    // Ensure required environment variables are set
    if (!process.env.OPENAI_API_KEY) {
      console.error('Please set OPENAI_API_KEY environment variable');
      process.exit(1);
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const metadataConfigManager = new MetadataConfigManager(process.env.EVALUATION_DIR || './evals/files');
    const evaluationManager = new EvaluationManager(metadataConfigManager, openai);
    const syncer = new EvaluationSyncer(metadataConfigManager, evaluationManager);
    const evaluator = new Evaluator(evaluationManager, metadataConfigManager);
    const evaluationSystem = new EvaluationSystem(syncer, evaluator);

    metadataConfigManager.initialize().then(async () => {
        evaluationSystem.run();
    }).catch((error) => {
        console.error('\nFailed', error);
        process.exit(1);
    });
}