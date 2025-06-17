import OpenAI from "openai";
import dotenv from 'dotenv';
import { EvaluationSyncer } from "./syncer";
import { Evaluator } from "./evaluator";
import { Logger } from "./logger";
import fs from 'fs';
import path from 'path';
import { EvaluationManager } from "./evaluation";
import { MetadataConfigManager } from "./metadata";

dotenv.config();

export class EvaluationOrchestrator {
    private syncer: EvaluationSyncer;
    private evaluator: Evaluator;

    constructor(syncer: EvaluationSyncer, evaluator: Evaluator) {
        this.syncer = syncer;
        this.evaluator = evaluator;
    }

    setupFiles() {
        try {
            Logger.log('info', 'Setting up evaluation files');
            
            // Create the base directory if it doesn't exist
            const baseDir = process.env.EVALUATION_DIR || './evals/files';
            if (!fs.existsSync(baseDir)) {
                fs.mkdirSync(baseDir, { recursive: true });
                Logger.log('debug', 'Created base directory', { directory: baseDir });
            }

            const requiredFiles = {
                'evaluations_metadata.json': {},
                'evaluation_hashes.json': {},
                'evaluations.json': {},
            };

            // Create each file if it doesn't exist
            for (const [filePath, defaultContent] of Object.entries(requiredFiles)) {
                const fullPath = path.join(baseDir, filePath);
                if (!fs.existsSync(fullPath)) {
                    // Only create the file if it doesn't exist
                    fs.writeFileSync(fullPath, JSON.stringify(defaultContent, null, 2));
                    Logger.log('debug', 'Created new file', { filePath: fullPath });
                } else {
                    Logger.log('debug', 'File already exists, skipping creation', { filePath: fullPath });
                }
            }

            Logger.log('info', 'Evaluation files setup completed');
        } catch (error: any) {
            Logger.log('error', 'Failed to setup evaluation files', { error: error.message });
            throw new Error(`Failed to setup evaluation files: ${error.message}`);
        }
    }

    async run(): Promise<boolean> {
        try {
            Logger.log('info', 'Starting evaluation run');

            // Setup evaluation files if they don't exist
            this.setupFiles();

            // Initialize new evaluations
            await this.evaluator.initializeNewEvaluations();

            // If there are any changes, create new evaluations
            const syncResult = await this.syncer.sync();
            if (!syncResult) {
                Logger.log('error', 'Sync failed, aborting run');
                return false;
            }

            // Run all created evaluations
            const runResult = await this.evaluator.runEvaluations();
            if (!runResult) {
                Logger.log('error', 'Run failed');
                return false;
            }

            Logger.log('info', 'Evaluation sync and run completed successfully');
            return true;
        } catch (error: any) {
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

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const metadataConfigManager = new MetadataConfigManager(process.env.EVALUATION_DIR || './evals/files');
    const evaluationManager = new EvaluationManager(metadataConfigManager, openai);
    const syncer = new EvaluationSyncer(metadataConfigManager, evaluationManager);
    const evaluator = new Evaluator(evaluationManager, metadataConfigManager);

    metadataConfigManager.initialize().then(async () => {
        const evaluationOrchestrator = new EvaluationOrchestrator(syncer, evaluator);
        await evaluationOrchestrator.run();
    }).catch((error) => {
        console.error('\nFailed', error);
        process.exit(1);
    });
}