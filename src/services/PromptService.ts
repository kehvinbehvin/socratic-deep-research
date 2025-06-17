import fs from 'fs';
import path from 'path';

export class PromptService {
    private systemPrompts: Record<string, string>;
    private userPrompts: Record<string, string>;

    constructor() {
        const evaluationsPath = path.join(process.cwd(), 'evals', 'files', `evaluations.json`);
        const evaluations = JSON.parse(fs.readFileSync(evaluationsPath, 'utf8'));

        for (const evalNames of Object.keys(evaluations)) {
            this.systemPrompts[evalNames] = evaluations[evalNames].targetPrompt.system.content
            this.userPrompts[evalNames] = evaluations[evalNames].targetPrompt.user.content
        }
    }

    getSystemPrompt(evalName: string) {
        if (!this.systemPrompts[evalName]) {
            throw new Error(`System prompt not found for evaluation ${evalName}`);
        }
        return this.systemPrompts[evalName];
    }

    getUserPrompt(evalName: string) {
        if (!this.userPrompts[evalName]) {
            throw new Error(`User prompt not found for evaluation ${evalName}`);
        }
        return this.userPrompts[evalName];
    }
}