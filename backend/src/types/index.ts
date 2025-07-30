// Re-export all types from evaluation.ts for backward compatibility
export * from "./evaluation.js";

// Legacy interfaces maintained for backward compatibility
export interface FailedTestCase {
  promptId?: string;
  testCaseId?: string;
  assertion: {
    type: string;
    value: string;
  };
  pass: boolean;
  score: number;
  reason: string;
  tokensUsed: {
    total: number;
    prompt: number;
    completion: number;
    cached: number;
    completionDetails: {
      reasoning: number;
      acceptedPrediction: number;
      rejectedPrediction: number;
    };
  };
  output?: string;
  input?: string;
  expectedOutput?: string;
  executionTime?: number;
}

export interface FailedCluster {
  reason: string;
  failedTestCases: FailedTestCase[];
  prompt: string;
}

export interface OptimizationResult {
  optimizedPrompt: string;
  improvements: string[];
  reasoning: string;
  confidence: number;
}

export interface PromptResult {
  success: boolean;
  prompt?: string;
  error?: string;
  metadata?: any;
}

export interface GenerationOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  generationConfig?: any;
}

export interface PromptTechnique {
  name: string;
  description: string;
  generator: (
    query: string,
    context?: string,
    expectedOutput?: string,
    parameters?: any,
  ) => Promise<string>;
}

export interface TechniqueDescription {
  name: string;
  description: string;
}

// Optimization-related interfaces
export interface OptimizationRequest {
  originalPrompt: string;
  failedClusters: FailedCluster[];
  promptId?: string;
}

export interface OptimizationHistory {
  id: string;
  originalPrompt: string;
  optimizedPrompt: string;
  failedClusters: FailedCluster[];
  improvements: string[];
  timestamp: Date;
  performanceGain?: number;
}

export interface PromptPerformance {
  averageScore: number;
  passRate: number;
  commonIssues: string[];
  totalTests?: number;
  executionTime?: number;
}

export interface OptimizationResponse {
  index?: number;
  promptId?: string;
  originalPrompt: string;
  optimizedPrompt: string;
  improvements: string[];
  success: boolean;
  metadata?: {
    originalLength: number;
    optimizedLength: number;
    clustersAnalyzed: number;
    optimizedAt: string;
  };
}

export interface OptimizationError {
  index: number;
  promptId?: string;
  error: string;
  success: false;
}
