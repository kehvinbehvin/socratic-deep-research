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
        evaluations: Array<{
            eval_uuid: string;
            file_uuid: string;
            message: string;
            runs: Array<{
                run_uuid: string;
                created_at: string;
            }>;
        }>;
    };
}

export type EvaluationHash = {
    [key: string]: {
        criteria?: string,
        testData?: string,
        schema?: string,
        targetPrompt?: string,
    }
}

export type Criteria = {
    name: string;
    type: string;
    model: string;
    input: Array<{
        role: string;
        content: string;
    }>;
}

export type TestData = Array<{
    input: {
        topic: {
            content: string;
        };
    };
    expected: {
        questions: Array<{
            content: string;
        }>;
    };
}>

export type TargetPrompt = {
    system: {
        content: string;
    };
    user: {
        content: string;
    };
}

export type Schema = {
    type: string;
    properties: Record<string, any>;
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

// export const testDataSchema: ZodType<TestData[]> = z.array(z.object({
//     input: z.object({
//         topic: z.object({
//             content: z.string(),
//         }),
//     }),
//     expected: z.object({
//         questions: z.array(z.object({
//             content: z.string(),
//         })),
//     }),
// }))

export const targetPromptSchema: ZodType<TargetPrompt> = z.object({  
    system: z.object({
        content: z.string(),
    }),
    user: z.object({
        content: z.string(),
    }),
})

export const schemaSchema: ZodType<Schema> = z.object({
    type: z.string(),   
    properties: z.record(z.string(), z.any()),
    required: z.array(z.string()),
}) 