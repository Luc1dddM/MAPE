import { z } from "zod";

// File type checking that works in both browser and SSR environments
const createFileSchema = () => {
  if (typeof File !== "undefined") {
    return z.instanceof(File);
  }
  // Fallback for SSR - check for File-like properties
  return z
    .object({
      name: z.string(),
      size: z.number(),
      type: z.string(),
    })
    .optional();
};

// Complete evaluation form schema
export const evaluationFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  prompts: z
    .array(
      z.object({
        content: z.string().min(1, "Prompt content is required"),
        name: z.string().min(1, "Prompt name is required"),
      }),
    )
    .min(1, "At least one prompt is required"),
  testCases: z
    .array(
      z.object({
        input: z.string().optional(), // Made optional since validation is handled in component
        expected: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  providers: z.array(z.string()).min(1, "Select at least one provider"),
  evaluationCriteria: z
    .array(z.string())
    .min(1, "Select at least one criteria"),
  additionalConfig: z.object({
    timeout: z
      .number()
      .min(1000, "Timeout must be at least 1000ms")
      .max(60000, "Timeout cannot exceed 60000ms"),
    maxConcurrency: z
      .number()
      .min(1, "Concurrency must be at least 1")
      .max(20, "Concurrency cannot exceed 20"),
    outputPath: z.string().min(1, "Output path is required"),
  }),
  csvFile: z.union([createFileSchema(), z.undefined()]).optional(), // For file upload
});

// Individual step schemas for granular validation
export const promptsStepSchema = z.object({
  prompts: z
    .array(
      z.object({
        name: z.string().min(1, "Name is required"),
        content: z.string().min(1, "Content is required"),
      }),
    )
    .min(1, "At least one prompt is required"),
});

// Simplified tests step schema - validation is handled in component logic
export const testsStepSchema = z.object({
  testCases: z
    .array(
      z.object({
        input: z.string().optional(),
        expected: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  csvFile: z.union([createFileSchema(), z.undefined()]).optional(),
});

export const configStepSchema = z.object({
  providers: z.array(z.string()).min(1, "Select at least one provider"),
  evaluationCriteria: z
    .array(z.string())
    .min(1, "Select at least one criteria"),
  additionalConfig: z.object({
    timeout: z
      .number()
      .min(1000, "Timeout must be at least 1000ms")
      .max(60000, "Timeout cannot exceed 60000ms"),
    maxConcurrency: z
      .number()
      .min(1, "Concurrency must be at least 1")
      .max(20, "Concurrency cannot exceed 20"),
    outputPath: z.string().min(1, "Output path is required"),
  }),
});

// Type inference from schemas
export type EvaluationFormData = z.infer<typeof evaluationFormSchema>;
export type PromptsStepData = z.infer<typeof promptsStepSchema>;
export type TestsStepData = z.infer<typeof testsStepSchema>;
export type ConfigStepData = z.infer<typeof configStepSchema>;
