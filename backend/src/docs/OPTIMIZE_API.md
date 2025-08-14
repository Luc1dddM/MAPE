# Optimize API Documentation

The Optimize API provides endpoints for improving prompts based on failed test case analysis. It uses the OptimizePromptService to analyze failure patterns and generate optimized prompts.

## Base URL
```
/api/optimize
```

## Endpoints

### 1. Optimize Prompt
**POST** `/api/optimize/prompt`

Optimizes a prompt based on failed test clusters.

#### Request Body
```json
{
  "originalPrompt": "string (required, 10-10000 chars)",
  "failedClusters": [
    {
      "reason": "string (required)",
      "failedTestCases": [
        {
          "assertion": {
            "type": "string",
            "value": "string"
          },
          "pass": false,
          "score": "number (0-10)",
          "reason": "string",
          "tokensUsed": {
            "total": "number",
            "prompt": "number",
            "completion": "number",
            "cached": "number",
            "completionDetails": {
              "reasoning": "number",
              "acceptedPrediction": "number",
              "rejectedPrediction": "number"
            }
          },
          "input": "string (optional)",
          "expectedOutput": "string (optional)",
          "output": "string (optional)"
        }
      ],
      "prompt": "string"
    }
  ],
  "promptId": "string (optional)"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "originalPrompt": "string",
    "optimizedPrompt": "string",
    "improvements": ["string"],
    "metadata": {
      "originalLength": "number",
      "optimizedLength": "number",
      "clustersAnalyzed": "number",
      "optimizedAt": "ISO string",
      "promptId": "string"
    }
  }
}
```

### 2. Analyze Failures
**POST** `/api/optimize/analyze`

Analyzes failed test clusters to identify patterns and generate insights.

#### Request Body
```json
{
  "failedClusters": [
    // Same structure as above
  ]
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "analysis": {
      "summary": {
        "totalClusters": "number",
        "totalFailedTests": "number",
        "averageTestsPerCluster": "number"
      },
      "patterns": {
        "mostCommonReasons": [["reason", "count"]],
        "assertionTypeDistribution": {
          "type": "count"
        },
        "scoreDistribution": {
          "low": "number",
          "medium": "number", 
          "high": "number"
        }
      },
      "recommendations": ["string"]
    },
    "clustersAnalyzed": "number",
    "analyzedAt": "ISO string"
  }
}
```

### 3. Get Optimization History
**GET** `/api/optimize/history/:promptId`

Retrieves optimization history for a specific prompt.

#### Query Parameters
- `limit` (optional): Number of history entries to return (default: 10)

#### Response
```json
{
  "success": true,
  "data": {
    "promptId": "string",
    "history": [
      {
        "id": "string",
        "originalPrompt": "string",
        "optimizedPrompt": "string",
        "improvements": ["string"],
        "timestamp": "ISO string"
      }
    ],
    "totalOptimizations": "number",
    "retrievedAt": "ISO string"
  }
}
```

### 4. Compare Prompts
**POST** `/api/optimize/compare`

Compares performance between original and optimized prompts.

#### Request Body
```json
{
  "originalPrompt": "string (required)",
  "optimizedPrompt": "string (required)",
  "testCases": [
    {
      "input": "string",
      "expected": "string"
    }
  ]
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "comparison": {
      "original": {
        "prompt": "string",
        "performance": {
          "averageScore": "number",
          "passRate": "number",
          "commonIssues": ["string"]
        }
      },
      "optimized": {
        "prompt": "string", 
        "performance": {
          "averageScore": "number",
          "passRate": "number",
          "commonIssues": ["string"]
        }
      },
      "improvements": ["string"],
      "recommendations": ["string"]
    },
    "comparedAt": "ISO string"
  }
}
```

### 5. Get Optimization Suggestions
**POST** `/api/optimize/suggestions`

Generates optimization suggestions without performing full optimization.

#### Request Body
```json
{
  "originalPrompt": "string (required)",
  "failedClusters": [
    // Same structure as optimize endpoint
  ]
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "originalPrompt": "string",
    "suggestions": ["string"],
    "suggestionsCount": "number",
    "generatedAt": "ISO string"
  }
}
```

### 6. Batch Optimize
**POST** `/api/optimize/batch`

Optimizes multiple prompts in a single request.

#### Request Body
```json
{
  "prompts": [
    {
      "originalPrompt": "string",
      "failedClusters": [],
      "promptId": "string (optional)"
    }
  ]
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "index": "number",
        "promptId": "string",
        "originalPrompt": "string",
        "optimizedPrompt": "string", 
        "improvements": ["string"],
        "success": true
      }
    ],
    "errors": [
      {
        "index": "number",
        "promptId": "string",
        "error": "string",
        "success": false
      }
    ],
    "summary": {
      "totalPrompts": "number",
      "successful": "number",
      "failed": "number",
      "successRate": "number"
    },
    "processedAt": "ISO string"
  }
}
```

## Error Responses

All endpoints return error responses in this format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `500`: Internal Server Error

## Usage Examples

### Basic Optimization Flow
```javascript
// 1. Run evaluation to get failed clusters
const evaluationResult = await fetch('/api/evaluations/run', {
  method: 'POST',
  body: JSON.stringify(evaluationConfig)
});

// 2. Extract failed clusters from evaluation
const { failedClusters } = evaluationResult.data;

// 3. Optimize the prompt
const optimizationResult = await fetch('/api/optimize/prompt', {
  method: 'POST',
  body: JSON.stringify({
    originalPrompt: "Your original prompt here",
    failedClusters: failedClusters,
    promptId: "my-prompt-v1"
  })
});

// 4. Use the optimized prompt
const { optimizedPrompt } = optimizationResult.data;
```

### Integration with Evaluation Flow
```javascript
// Complete workflow: Evaluate -> Optimize -> Re-evaluate
async function improvePrompt(originalPrompt, testCases) {
  // 1. Initial evaluation
  const evaluation = await evaluatePrompt(originalPrompt, testCases);
  
  if (evaluation.failedTests.length > 0) {
    // 2. Cluster failed tests
    const clusters = await clusterFailures(evaluation.failedTests);
    
    // 3. Optimize prompt
    const optimization = await optimizePrompt(originalPrompt, clusters);
    
    // 4. Re-evaluate optimized prompt
    const newEvaluation = await evaluatePrompt(optimization.optimizedPrompt, testCases);
    
    // 5. Compare results
    const comparison = await comparePrompts(originalPrompt, optimization.optimizedPrompt);
    
    return {
      original: evaluation,
      optimized: newEvaluation,
      improvement: comparison
    };
  }
  
  return { message: "No optimization needed" };
}
```

## Environment Variables

Required environment variables:
- `GEMINI_API_KEY`: Google Generative AI API key for optimization

## Rate Limits

The optimization endpoints use the Google Generative AI API and are subject to:
- API rate limits from Google
- Token usage limits
- Concurrent request limits

Consider implementing request queuing for batch operations.