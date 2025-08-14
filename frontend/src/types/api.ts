export interface PromptGenerationRequest {
  query: string;
  context?: string;
  expectedOutput: string;
  techniques?: TechniqueType[];
  parameters?: TechniqueParameters;
}

export interface PromptGenerationResponse {
  success: boolean;
  data: {
    results: Record<string, PromptResult>;
    summary: {
      totalTechniques: number;
      successfulTechniques: number;
      failedTechniques: number;
      generatedAt: string;
    };
  };
}

export interface PromptResult {
  success: boolean;
  prompt?: string;
  technique: string;
  description?: string;
  usage?: string;
  error?: string;
  metadata?: {
    technique: string;
    generatedAt: string;
    parameters: Record<string, any>;
  };
}

export interface PromptTechnique {
  name: string;
  description: string;
}

export interface TechniquesResponse {
  success: boolean;
  data: {
    techniques: PromptTechnique[];
    count: number;
  };
}

export interface PromptEvaluationRequest {
  prompt: string;
  expectedOutput: string;
  actualOutput: string;
}

export interface PromptEvaluationResponse {
  success: boolean;
  data: {
    evaluation: {
      score?: number;
      analysis?: string;
      improvements?: string[];
      strengths?: string[];
      raw?: string;
    };
    evaluatedAt: string;
    errorClusters: any;
  };
}

export interface PromptTestRequest {
  prompt: string;
  testInput: string;
  options?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
  };
}

export interface PromptTestResponse {
  success: boolean;
  data: {
    input: string;
    output: string;
    prompt: string;
    testedAt: string;
  };
}

export interface PromptVariationRequest {
  prompt: string;
  count?: number;
  options?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
  };
}

export interface PromptVariationResponse {
  success: boolean;
  data: {
    originalPrompt: string;
    variations: Array<{
      id: number;
      content: string;
      parameters: Record<string, any>;
    }>;
    count: number;
    generatedAt: string;
  };
}

export interface PromptOptimizationRequest {
  prompt: string;
  issues?: string;
  targetImprovement?: string;
}

export interface PromptOptimizationResponse {
  success: boolean;
  data: {
    original: string;
    optimization: {
      optimizedPrompt?: string;
      changes?: string[];
      benefits?: string[];
      reasoning?: string;
      raw?: string;
    };
    optimizedAt: string;
  };
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  errors?: Array<{
    msg: string;
    param: string;
    location: string;
  }>;
}

export type TechniqueType =
  | "few-shot"
  | "chain-of-thought"
  | "zero-shot"
  | "role-based"
  | "template-based"
  | "iterative-refinement";

export interface TechniqueParameters {
  "few-shot"?: {
    numExamples?: number;
  };
  "chain-of-thought"?: {
    reasoningSteps?: number;
  };
  "zero-shot"?: {
    tone?: string;
  };
  "role-based"?: {
    role?: string;
  };
  "template-based"?: {
    templateStructure?: string;
  };
  "iterative-refinement"?: {
    iterations?: number;
  };
}

// Evaluation Types
export interface EvaluationCriteria {
  name: string;
  description: string;
  enabled: boolean;
}

export interface Provider {
  id: string;
  name?: string;
  description?: string;
  config?: {
    apiKey?: string;
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
  supportedParams?: string[];
}

export interface TestCase {
  description: string;
  input?: string;
  expectedOutput?: string;
}

export interface PromptfooEvaluationRequest {
  prompts: string[];
  testCases?: TestCase[];
  testDataFile?: File[];
  csvFile?: File;
  providers?: string[] | Provider[];
  evaluationCriteria?: EvaluationCriteria[];
  description?: string;
}

export interface AssertionResult {
  type: string;
  score: number;
  maxScore: number;
  passed: boolean;
  reason: string;
  metric: string;
}

export interface ErrorCluster {
  id: number;
  size: number;
  tests: Array<
    EvaluationResult & {
      errorText: string;
      similarity: number;
    }
  >;
  representativeError: string;
  avgSimilarity: number;
  category: {
    name: string;
    description: string;
    commonPatterns: string[];
    suggestions: string[];
  };
}

export interface ErrorClusteringSummary {
  totalFailed: number;
  clustersFound: number;
  analysisTime: string;
  avgClusterSize?: number;
  error?: string;
}

export interface ErrorClusteringResults {
  clusters: ErrorCluster[];
  summary: ErrorClusteringSummary;
  insights: string;
  errorAnalysis?: {
    categories: Array<{
      name: string;
      description: string;
      errorIndices: number[];
      commonPatterns: string[];
      suggestions: string[];
    }>;
    insights: string;
  };
}

export interface EvaluationResult {
  id: string;
  prompt: {
    raw: string;
    label: string;
  };
  response: string;
  score: number;
  passed: boolean;
  vars: Array<{
    query: string;
    expectedAnswer?: string;
  }>;
  reason?: string;
  latencyMs: number;
}

export interface EvaluationSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageScore: number;
  totalScore: number;
}

export interface EvaluationMetadata {
  prompts: string[];
  providers: string[];
  timestamp: string;
  version: string;
}

export interface EvaluationResponse {
  success: boolean;
  data: {
    evaluationId: string;
    configPath: string;
    timestamp: string;
    summary: EvaluationSummary;
    results: EvaluationResult[];
    metadata: EvaluationMetadata;
    errorClusters?: ErrorClusteringResults;
  };
}

export interface EvaluationListItem {
  id: string;
  filename: string;
  createdAt: string;
  modifiedAt: string;
  size: number;
}

export interface EvaluationListResponse {
  success: boolean;
  data: {
    evaluations: EvaluationListItem[];
    count: number;
  };
}

export interface EvaluationStatusResponse {
  success: boolean;
  data: {
    evaluationId: string;
    status: "running" | "completed" | "failed";
  };
}

export interface CriteriaResponse {
  success: boolean;
  data: {
    criteria: EvaluationCriteria[];
    count: number;
  };
}

export interface ProvidersResponse {
  success: boolean;
  data: {
    providers: Provider[];
    count: number;
  };
}
