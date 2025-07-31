/**
 * Example demonstrating the complete optimize flow
 * This shows how to use the optimization endpoints and services
 */

import { FailedCluster, OptimizationRequest } from '../types/index.js';

// Example failed clusters data (typically from evaluation results)
const exampleFailedClusters: FailedCluster[] = [
  {
    reason: "The AI's output correctly identifies `isValid` as true and `isRelevant` as false. However, the `cleanedQuery` field is an empty string, while the expected output shows the original query. The AI is being too aggressive in removing content.",
    failedTestCases: [
      {
        assertion: {
          type: "llm-rubric",
          value: "Evaluate the accuracy of the AI response considering factual correctness, proper handling of input, and adherence to expected format."
        },
        pass: false,
        score: 3,
        reason: "Empty cleanedQuery field when it should preserve the original query content",
        tokensUsed: {
          total: 1813,
          prompt: 410,
          completion: 133,
          cached: 0,
          completionDetails: {
            reasoning: 0,
            acceptedPrediction: 0,
            rejectedPrediction: 0,
          },
        },
        input: "My dog hates electric bills",
        expectedOutput: "My dog hates electric bills",
        output: ""
      }
    ],
    prompt: "You are an expert query analysis system for energy services. Analyze user queries and determine their relevance to actual energy services."
  },
  {
    reason: "The AI incorrectly sets `isRelevant` to `false` and provides an empty `cleanedQuery`, which contradicts the expected output where `isRelevant` is `true`. The core purpose of identifying relevance was missed.",
    failedTestCases: [
      {
        assertion: {
          type: "llm-rubric",
          value: "Evaluate accuracy considering factual correctness, proper input handling, and format adherence."
        },
        pass: false,
        score: 1,
        reason: "Misidentified relevance and failed to clean query properly",
        tokensUsed: {
          total: 1957,
          prompt: 431,
          completion: 108,
          cached: 0,
          completionDetails: {
            reasoning: 0,
            acceptedPrediction: 0,
            rejectedPrediction: 0,
          },
        },
        input: "How much is my electricity bill?",
        expectedOutput: "electricity bill inquiry",
        output: ""
      }
    ],
    prompt: "You are an expert query analysis system for energy services. Analyze user queries and determine their relevance to actual energy services."
  }
];

// Example optimization request
const optimizationRequest: OptimizationRequest = {
  originalPrompt: "You are an expert query analysis system for energy services. Analyze user queries and determine their relevance to actual energy services.",
  failedClusters: exampleFailedClusters,
  promptId: "energy-query-analyzer-v1"
};

/**
 * Example API calls for the optimize flow
 */
export const optimizeFlowExamples = {
  
  /**
   * 1. Basic Prompt Optimization
   * POST /api/optimize/prompt
   */
  basicOptimization: {
    endpoint: 'POST /api/optimize/prompt',
    requestBody: optimizationRequest,
    expectedResponse: {
      success: true,
      data: {
        originalPrompt: "You are an expert query analysis system...",
        optimizedPrompt: "You are an expert query analysis system for energy services...",
        improvements: [
          "Enhanced output format specifications",
          "Added step-by-step reasoning instructions",
          "Improved context handling and interpretation"
        ],
        metadata: {
          originalLength: 120,
          optimizedLength: 450,
          clustersAnalyzed: 2,
          optimizedAt: "2024-01-15T10:30:00Z",
          promptId: "energy-query-analyzer-v1"
        }
      }
    }
  },

  /**
   * 2. Analyze Failed Clusters
   * POST /api/optimize/analyze
   */
  analyzeFailures: {
    endpoint: 'POST /api/optimize/analyze',
    requestBody: {
      failedClusters: exampleFailedClusters
    },
    expectedResponse: {
      success: true,
      data: {
        analysis: {
          summary: {
            totalClusters: 2,
            totalFailedTests: 2,
            averageTestsPerCluster: 1
          },
          patterns: {
            mostCommonReasons: [
              ["empty cleanedquery field", 1],
              ["misidentified relevance", 1]
            ],
            assertionTypeDistribution: {
              "llm-rubric": 2
            },
            scoreDistribution: {
              low: 2,
              medium: 0,
              high: 0
            }
          },
          recommendations: [
            "Focus on fundamental prompt clarity - many tests have very low scores",
            "Add explicit output format specifications and examples"
          ]
        },
        clustersAnalyzed: 2,
        analyzedAt: "2024-01-15T10:30:00Z"
      }
    }
  },

  /**
   * 3. Get Optimization History
   * GET /api/optimize/history/:promptId
   */
  getHistory: {
    endpoint: 'GET /api/optimize/history/energy-query-analyzer-v1?limit=5',
    expectedResponse: {
      success: true,
      data: {
        promptId: "energy-query-analyzer-v1",
        history: [
          {
            id: "opt_123456",
            originalPrompt: "You are an expert query analysis system...",
            optimizedPrompt: "You are an expert query analysis system...",
            improvements: ["Enhanced format specifications"],
            timestamp: "2024-01-15T10:30:00Z"
          }
        ],
        totalOptimizations: 3,
        retrievedAt: "2024-01-15T10:35:00Z"
      }
    }
  },

  /**
   * 4. Compare Prompts
   * POST /api/optimize/compare
   */
  comparePrompts: {
    endpoint: 'POST /api/optimize/compare',
    requestBody: {
      originalPrompt: "You are an expert query analysis system for energy services.",
      optimizedPrompt: "You are an expert query analysis system for energy services. Follow these steps: 1) Analyze the query context...",
      testCases: [
        { input: "My electricity bill is high", expected: "relevant" },
        { input: "My dog likes walks", expected: "irrelevant" }
      ]
    },
    expectedResponse: {
      success: true,
      data: {
        comparison: {
          original: {
            prompt: "You are an expert query analysis system...",
            performance: {
              averageScore: 6.2,
              passRate: 0.65,
              commonIssues: ["Format compliance", "Context handling"]
            }
          },
          optimized: {
            prompt: "You are an expert query analysis system...",
            performance: {
              averageScore: 8.1,
              passRate: 0.85,
              commonIssues: ["Minor edge cases"]
            }
          },
          improvements: [
            "Improved average score by 30.6%",
            "Increased pass rate by 20%"
          ],
          recommendations: [
            "Test with additional edge cases",
            "Monitor performance over time"
          ]
        },
        comparedAt: "2024-01-15T10:30:00Z"
      }
    }
  },

  /**
   * 5. Get Optimization Suggestions
   * POST /api/optimize/suggestions
   */
  getSuggestions: {
    endpoint: 'POST /api/optimize/suggestions',
    requestBody: {
      originalPrompt: "Analyze the user query.",
      failedClusters: exampleFailedClusters
    },
    expectedResponse: {
      success: true,
      data: {
        originalPrompt: "Analyze the user query.",
        suggestions: [
          "Add step-by-step reasoning instructions",
          "Include explicit output format specifications",
          "Add context preservation instructions",
          "Include accuracy validation requirements"
        ],
        suggestionsCount: 4,
        generatedAt: "2024-01-15T10:30:00Z"
      }
    }
  },

  /**
   * 6. Batch Optimization
   * POST /api/optimize/batch
   */
  batchOptimize: {
    endpoint: 'POST /api/optimize/batch',
    requestBody: {
      prompts: [
        {
          originalPrompt: "Analyze user queries for energy services.",
          failedClusters: exampleFailedClusters,
          promptId: "energy-analyzer-v1"
        },
        {
          originalPrompt: "Process customer support requests.",
          failedClusters: [],
          promptId: "support-processor-v1"
        }
      ]
    },
    expectedResponse: {
      success: true,
      data: {
        results: [
          {
            index: 0,
            promptId: "energy-analyzer-v1",
            originalPrompt: "Analyze user queries for energy services.",
            optimizedPrompt: "You are an expert energy services query analyzer...",
            improvements: ["Enhanced clarity", "Added examples"],
            success: true
          }
        ],
        errors: [
          {
            index: 1,
            promptId: "support-processor-v1",
            error: "No failed clusters provided for analysis",
            success: false
          }
        ],
        summary: {
          totalPrompts: 2,
          successful: 1,
          failed: 1,
          successRate: 50
        },
        processedAt: "2024-01-15T10:30:00Z"
      }
    }
  }
};

/**
 * Example usage in a client application
 */
export const clientUsageExample = `
// 1. Basic optimization
const response = await fetch('/api/optimize/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalPrompt: "Analyze user queries.",
    failedClusters: failedClustersFromEvaluation,
    promptId: "my-prompt-v1"
  })
});

const { data } = await response.json();
console.log('Optimized prompt:', data.optimizedPrompt);
console.log('Improvements:', data.improvements);

// 2. Get optimization history
const historyResponse = await fetch('/api/optimize/history/my-prompt-v1');
const history = await historyResponse.json();
console.log('Previous optimizations:', history.data.history);

// 3. Compare performance
const comparisonResponse = await fetch('/api/optimize/compare', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalPrompt: originalPrompt,
    optimizedPrompt: data.optimizedPrompt,
    testCases: testCases
  })
});

const comparison = await comparisonResponse.json();
console.log('Performance improvement:', comparison.data.comparison.improvements);
`;

export default optimizeFlowExamples;