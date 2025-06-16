import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { systemPrompt, userPrompt } from "./data/questions_prompts";
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Handling parsing errors
const { type, properties, required } = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "questions_schema.json"), "utf8"))
const questionsCriteria = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "questions_criteria.json"), "utf8"))

interface Metadata {
    eval_uuid?: string;
    file_uuid?: string;
    run_uuid?: string;
    created_at?: string;
    updated_at?: string;
}

const createMetadata = async (metadata: Metadata) => {
    // Create metadata file if does not exist
    if (!fs.existsSync(path.join(__dirname, "data", "metadata.json"))) {
        fs.writeFileSync(path.join(__dirname, "data", "metadata.json"), JSON.stringify(metadata, null, 2))
        console.log("Metadata file created")
    } else {
        console.log("Reusing metadata file")
    }
}

const setMetadata = async (metadata: Metadata) => {
    // Update metadata file
    console.log("Setting metadata file")
    const existingMetadata = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "metadata.json"), "utf8"))
    fs.writeFileSync(path.join(__dirname, "data", "metadata.json"), JSON.stringify({ ...existingMetadata, ...metadata }, null, 2))
}

const createEval = async (metadata: Metadata) => {
    // Send API request to create a new eval
    const evaluation = await openai.evals.create({
        name: "Socratic Question Generation",
        data_source_config: {
            type: "custom",
            item_schema: {
                type,
                properties,
                required
            },
            include_sample_schema: true,
        },
        testing_criteria: questionsCriteria,
    });

    console.log("Eval created", evaluation)

    // Save the returned uuid
    setMetadata({ eval_uuid: evaluation.id, updated_at: new Date().toISOString()})
}

const uploadFiles = async (metadata: Metadata) => {
    const file = await openai.files.create({
        file: fs.createReadStream(path.join(__dirname, "data", "questions.jsonl")),
        purpose: "evals",
    })

    console.log("Uploaded file", file)

    setMetadata({ file_uuid: file.id, updated_at: new Date().toISOString() })
}

const runEval = async (metadata: Metadata) => {
    if (!metadata || !metadata.eval_uuid || !metadata.file_uuid) {
        metadata = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "metadata.json"), "utf8"))
    }

    if (!metadata.eval_uuid) {
        throw new Error("Eval UUID is required")
    }

    if (!metadata.file_uuid) {
        throw new Error("File UUID is required")
    }

    const run = await openai.evals.runs.create(metadata.eval_uuid, {
        name: "Socratic Question Generation",
        data_source: {
            type: "completions",
            model: "gpt-4.1",
            input_messages: {
                type: "template",
                template: [
                    { role: "developer", content: systemPrompt },
                    { role: "user", content: "{{ item.input.topic.content }}" },
                ],
            },
            source: { type: "file_id", id: metadata.file_uuid },
        },
    });

    console.log("Evaluation run trigerred", run)

    setMetadata({ run_uuid: run.id, updated_at: new Date().toISOString() })
}

const runEvaluations = async () => {
    const metadata = {
        created_at: new Date().toISOString()
    }

    try {
        await createMetadata(metadata)
        await createEval(metadata)
        await uploadFiles(metadata)
        await runEval(metadata)

        console.log("Success, Check dashboard")
    } catch (error: unknown) {
        console.log(error)
    }
}

if (require.main === module) {
    // Ensure required environment variables are set
    if (!process.env.OPENAI_API_KEY) {
      console.error('Please set OPENAI_API_KEY environment variable');
      process.exit(1);
    }
  
    runEvaluations()
      .then(() => {
        console.log('\nEvaludation completed successfully');
        process.exit(0);
      })
      .catch(error => {
        console.error('\nEvaludation failed:', error);
        process.exit(1);
      });
  }