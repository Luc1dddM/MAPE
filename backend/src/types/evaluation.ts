export interface TestCase {
  id?: string;
  input?: string;
  vars?: Record<string, any>;
  assert?: AssertionConfig[];
  expected?: string;
  metadata?: Record<string, any>;
}

export interface PromptConfig {
  id?: string;
  content?: string;
  label?: string;
  raw?: string;
  template?: string;
  vars?: Record<string, any>;
}

export interface ProviderConfig {
  id: string;
  config?: {
    apiKey?: string;
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    [key: string]: any;
  };
}

export interface AssertionConfig {
  type: string;
  value?: any;
  threshold?: number;
  weight?: number;
  metric?: string;
  [key: string]: any;
}

export interface EvaluationCriteria {
  name: string;
  description: string;
  enabled: boolean;
  weight?: number;
  threshold?: number;
}

export interface EvaluationRequest {
  prompts: (string | PromptConfig)[];
  testCases?: TestCase[];
  testDataFile?: string;
  providers: ProviderConfig[];
  evaluationCriteria: string[];
  description?: string;
  metadata?: Record<string, any>;
}

export interface EvaluationResponse {
  output: string;
  tokenUsage?: {
    total: number;
    prompt: number;
    completion: number;
    [key: string]: any;
  };
  latencyMs?: number;
  cost?: number;
  [key: string]: any;
}

export interface GradingResult {
  score: number;
  pass: boolean;
  reason?: string;
  componentResults?: ComponentResult[];
  [key: string]: any;
}

export interface ComponentResult {
  assertion?: AssertionConfig;
  score: number;
  maxScore: number;
  passed: boolean;
  reason?: string;
  value?: any;
  type?: string;
}

export interface EvaluationResult {
  id: string;
  prompt?: PromptConfig;
  provider?: string;
  response?: EvaluationResponse;
  gradingResult?: GradingResult;
  latencyMs?: number;
  tokenUsage?: any;
  success?: boolean;
  reason?: string;
  overallGradingScore?: number;
  error?: string;
  [key: string]: any;
}

export interface EvaluationSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageScore: number;
  totalScore: number;
  duration?: number;
  [key: string]: any;
}

export interface EvaluationMetadata {
  prompts: any;
  providers: any;
  timestamp: string;
  version: string;
  evalId: string;
  description?: string;
  tokenUsage?: any;
  [key: string]: any;
}

export interface EvaluationResults {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  summary: EvaluationSummary;
  results: EvaluationResult[];
  metadata: EvaluationMetadata;
  errorClusters?: ErrorCluster[];
}

export interface ErrorCluster {
  id: number;
  size: number;
  tests: any[];
  representativeError: string;
  avgSimilarity: number;
  category: ErrorCategory;
}

export interface ErrorCategory {
  name: string;
  description: string;
  errorIndices?: number[];
  commonPatterns: string[];
  suggestions: string[];
}

export interface ClusterResult {
  clusters: ErrorCluster[];
  summary: {
    totalFailed: number;
    clustersFound: number;
    analysisTime: string;
    avgClusterSize?: number;
  };
  insights: string;
  errorAnalysis?: {
    categories: ErrorCategory[];
    insights: string;
  };
}

export interface EmbeddingData {
  index: number;
  embedding: number[];
  text: string;
  originalTest: any;
}

export interface PromptfooConfig {
  description: string;
  providers: ProviderConfig[];
  prompts: (string | PromptConfig)[];
  tests: TestCase[];
  defaultTest?: TestCase;
  outputPath?: string;
  [key: string]: any;
}

export interface KMeansResult {
  clusters: number[][];
  centroids: number[][];
  labels: number[];
  iterations?: number;
  converged?: boolean;
}

export interface EvaluationListItem {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  description?: string;
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  averageScore?: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  supportedParams: string[];
}

export interface CriteriaInfo {
  name: string;
  description: string;
  enabled: boolean;
}

export interface DownloadFormat {
  format: 'json' | 'csv';
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
