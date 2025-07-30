import { z } from "zod";

export const promptsStepSchema = z.object({
    prompts: z.array(
        z.object({
            name: z.string().min(1, "Name is required"),
            content: z.string().min(1, "Content is required"),
        })
    ).min(1, "At least one prompt is required"),
});

export const testsStepSchema = z.object({
    testCases: z.array(
        z.object({
            input: z.string().min(1, "Input is required"),
            expected: z.string().optional(),
            description: z.string().optional(),
        })
    ).min(1, "At least one test case is required"),
});

export const configStepSchema = z.object({
    providers: z.array(z.string()).min(1, "Select at least one provider"),
    evaluationCriteria: z.array(z.string()).min(1, "Select at least one criteria"),
    additionalConfig: z.object({
        timeout: z.number().min(1000).max(60000),
        maxConcurrency: z.number().min(1).max(20),
        outputPath: z.string().min(1),
    }),
});
