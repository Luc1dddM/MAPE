/**
 * Test file for the optimize flow
 * This demonstrates how to test the optimization endpoints
 */

import { FailedCluster } from '../types/index.js';

// Mock failed clusters for testing
const mockFailedClusters: FailedCluster[] = [
  {
    reason: "The AI's output has empty cleanedQuery field when it should preserve content",
    failedTestCases: [
      {
        assertion: {
          type: "llm-rubric",
          value: "Evaluate accuracy of AI response"
        },
        pass: false,
        score: 3,
        reason: "Empty cleanedQuery field",
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
    prompt: "You are an expert query analysis system for energy services."
  }
];

// Test data for API calls
export const testOptimizeFlow = {
  // Test basic optimization
  optimizePrompt: {
    url: '/api/optimize/prompt',
    method: 'POST',
    body: {
      originalPrompt: "Analyze user queries for energy services.",
      failedClusters: mockFailedClusters,
      promptId: "test-prompt-v1"
    }
  },

  // Test failure analysis
  analyzeFailures: {
    url: '/api/optimize/analyze',
    method: 'POST',
    body: {
      failedClusters: mockFailedClusters
    }
  },

  // Test getting suggestions
  getSuggestions: {
    url: '/api/optimize/suggestions',
    method: 'POST',
    body: {
      originalPrompt: "Analyze user queries.",
      failedClusters: mockFailedClusters
    }
  },

  // Test batch optimization
  batchOptimize: {
    url: '/api/optimize/batch',
    method: 'POST',
    body: {
      prompts: [
        {
          originalPrompt: "Analyze user queries for energy services.",
          failedClusters: mockFailedClusters,
          promptId: "test-prompt-1"
        },
        {
          originalPrompt: "Process customer support requests.",
          failedClusters: [],
          promptId: "test-prompt-2"
        }
      ]
    }
  }
};

// Example test using a testing framework like Jest
export const exampleTests = `
describe('Optimize Flow API', () => {
  test('should optimize prompt successfully', async () => {
    const response = await fetch('/api/optimize/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testOptimizeFlow.optimizePrompt.body)
    });

    const result = await response.json();
    
    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data.optimizedPrompt).toBeDefined();
    expect(result.data.improvements).toBeInstanceOf(Array);
    expect(result.data.metadata.clustersAnalyzed).toBe(1);
  });

  test('should analyze failures and provide insights', async () => {
    const response = await fetch('/api/optimize/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testOptimizeFlow.analyzeFailures.body)
    });

    const result = await response.json();
    
    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data.analysis.summary).toBeDefined();
    expect(result.data.analysis.patterns).toBeDefined();
    expect(result.data.analysis.recommendations).toBeInstanceOf(Array);
  });

  test('should handle validation errors', async () => {
    const response = await fetch('/api/optimize/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalPrompt: "", // Invalid: too short
        failedClusters: []   // Invalid: empty array
      })
    });

    const result = await response.json();
    
    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  test('should get optimization history', async () => {
    // First optimize a prompt
    await fetch('/api/optimize/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testOptimizeFlow.optimizePrompt.body)
    });

    // Then get history
    const response = await fetch('/api/optimize/history/test-prompt-v1');
    const result = await response.json();
    
    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data.history).toBeInstanceOf(Array);
    expect(result.data.promptId).toBe('test-prompt-v1');
  });

  test('should perform batch optimization', async () => {
    const response = await fetch('/api/optimize/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testOptimizeFlow.batchOptimize.body)
    });

    const result = await response.json();
    
    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data.results).toBeInstanceOf(Array);
    expect(result.data.summary.totalPrompts).toBe(2);
    expect(result.data.summary.successful).toBeGreaterThan(0);
  });
});
`;

export default testOptimizeFlow;