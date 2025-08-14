import apiClient from "./api";

export interface OptimizePromptRequest {
  originalPrompt: string;
  failedClusters: Array<{
    reason: string;
    failedTestCases: Array<{
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
    }>;
    prompt: string;
  }>;
  promptId?: string;
}

export interface OptimizePromptResponse {
  success: boolean;
  data: {
    originalPrompt: string;
    optimizedPrompt: string;
    improvements: string[];
    metadata: {
      originalLength: number;
      optimizedLength: number;
      clustersAnalyzed: number;
      optimizedAt: string;
      promptId?: string;
    };
  };
  error?: string;
  message?: string;
}

export interface OptimizationSuggestionsRequest {
  originalPrompt: string;
  failedClusters: Array<{
    reason: string;
    failedTestCases: Array<{
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
    }>;
    prompt: string;
  }>;
}

export interface OptimizationSuggestionsResponse {
  success: boolean;
  data: {
    originalPrompt: string;
    suggestions: string[];
    suggestionsCount: number;
    generatedAt: string;
  };
  error?: string;
  message?: string;
}

export interface AnalyzeFailuresRequest {
  failedClusters: Array<{
    reason: string;
    failedTestCases: Array<{
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
    }>;
    prompt: string;
  }>;
}

export interface AnalyzeFailuresResponse {
  success: boolean;
  data: {
    analysis: {
      summary: {
        totalClusters: number;
        totalFailedTests: number;
        averageTestsPerCluster: number;
      };
      patterns: {
        mostCommonReasons: Array<[string, number]>;
        assertionTypeDistribution: Record<string, number>;
        scoreDistribution: {
          low: number;
          medium: number;
          high: number;
        };
      };
      recommendations: string[];
    };
    clustersAnalyzed: number;
    analyzedAt: string;
  };
  error?: string;
  message?: string;
}

export interface ComparePromptsRequest {
  originalPrompt: string;
  optimizedPrompt: string;
  testCases?: any[];
}

export interface ComparePromptsResponse {
  success: boolean;
  data: {
    comparison: {
      original: {
        prompt: string;
        performance: {
          averageScore: number;
          passRate: number;
          commonIssues: string[];
        };
      };
      optimized: {
        prompt: string;
        performance: {
          averageScore: number;
          passRate: number;
          commonIssues: string[];
        };
      };
      improvements: string[];
      recommendations: string[];
    };
    comparedAt: string;
  };
  error?: string;
  message?: string;
}

export const optimizeService = {
  /**
   * Optimize a prompt based on failed test clusters
   */
  async optimizePrompt(
    data: OptimizePromptRequest,
  ): Promise<OptimizePromptResponse> {
    const response = await apiClient.post<OptimizePromptResponse>(
      "/api/optimize/prompt",
      data,
    );
    return response.data;
  },

  /**
   * Get optimization suggestions without full optimization
   */
  async getOptimizationSuggestions(
    data: OptimizationSuggestionsRequest,
  ): Promise<OptimizationSuggestionsResponse> {
    const response = await apiClient.post<OptimizationSuggestionsResponse>(
      "/api/optimize/suggestions",
      data,
    );
    return response.data;
  },

  /**
   * Analyze failed test clusters for optimization insights
   */
  async analyzeFailures(
    data: AnalyzeFailuresRequest,
  ): Promise<AnalyzeFailuresResponse> {
    const response = await apiClient.post<AnalyzeFailuresResponse>(
      "/api/optimize/analyze",
      data,
    );
    return response.data;
  },

  /**
   * Compare original vs optimized prompt performance
   */
  async comparePrompts(
    data: ComparePromptsRequest,
  ): Promise<ComparePromptsResponse> {
    const response = await apiClient.post<ComparePromptsResponse>(
      "/api/optimize/compare",
      data,
    );
    return response.data;
  },

  /**
   * Get optimization history for a specific prompt
   */
  async getOptimizationHistory(
    promptId: string,
    limit: number = 10,
  ): Promise<{
    success: boolean;
    data: {
      promptId: string;
      history: Array<{
        id: string;
        originalPrompt: string;
        optimizedPrompt: string;
        failedClusters: any[];
        improvements: string[];
        timestamp: string;
        performanceGain?: number;
      }>;
      totalOptimizations: number;
      retrievedAt: string;
    };
    error?: string;
    message?: string;
  }> {
    const response = await apiClient.get(
      `/api/optimize/history/${promptId}?limit=${limit}`,
    );
    return response.data;
  },
};
