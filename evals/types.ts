import { z, ZodType } from "zod";

export type Evaluation = {
    [key: string]: {
        criteria: Criteria,
        testData: TestData,
        schema: Schema,
        targetPrompt: TargetPrompt,
    }
}

export type EvaluationMetadata = {
    [key: string]: {
        evaluations: [
            {
                eval_uuid: string,
                file_uuid: string,
                message: string,
                runs: {
                    run_uuid: string,
                    created_at: string,
                }[]
            }
        ]
    }
}

export type EvaluationHash = {
    [key: string]: {
        criteria: string,
        testData: string,
        schema: string,
        targetPrompt: string,
    }
}

export type Criteria = {
    name: string;
    type: string;
    model: string;
    input: {
        role: string;
        content: string;
    }[];
}

export type TestData = {
    input: {
        role: string;
        content: string;
    }[];
}

export type TargetPrompt = {
    system: {
        role: string;
        content: string;
    },
    user: {
        role: string;
        content: string;
    }
}

export type Schema = {
    type: string;
    properties: {
        [key: string]: string;
    };
    required: string[];
}

export const criteriaSchema: ZodType<Criteria[]> = z.array(z.object({
    name: z.string(),
    type: z.string(),
    model: z.string(),
    input: z.array(z.object({
        role: z.string(),
        content: z.string(),    
    })),
}))

export const testDataSchema: ZodType<TestData[]> = z.array(z.object({
    input: z.array(z.object({
        role: z.string(),
        content: z.string(),    
    })),
}))

export const targetPromptSchema: ZodType<TargetPrompt> = z.object({  
    system: z.object({
        role: z.string(),
        content: z.string(),
    }),
    user: z.object({
        role: z.string(),
        content: z.string(),
    }),
})

export const schemaSchema: ZodType<Schema> = z.object({
    type: z.string(),   
    properties: z.record(z.string(), z.string()),
    required: z.array(z.string()),
}) 