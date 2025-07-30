# Optimize Flow - Backend Implementation

## Overview

The Optimize Flow provides a complete system for improving prompts based on failed test case analysis. It integrates with the evaluation system to automatically identify issues and generate optimized prompts.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Evaluation    │───▶│  Error Clustering │───▶│  Optimization   │
│     System      │    │     Service       │    │    Service      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Failed Test     │    │ Clustered        │    │ Optimized       │
│ Cases           │    │ Failures         │    │ Prompt          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components

### 1. OptimizeController (`/src/controllers/OptimizeController.ts`)
- **Purpose**: Handles HTTP requests for prompt optimization
- **Key Methods**:
  - `optimizePrompt()`: Main optimization endpoint
  - `analyzeFailures()`: Analyze failure patterns
  - `getOptimizationHistory()`: Retrieve optimization history
  - `comparePrompts()`: Compare original vs optimized performance
  - `batchOptimize()`: Optimize multiple prompts

### 2. OptimizeRoutes (`/src/routes/optimizeRoutes.ts`)
- **Purpose**: Define API endpoints for optimization
- **Endpoints**:
  - `POST /api/optimize/prompt` - Optimize a single prompt
  - `POST /api/optimize/analyze` - Analyze failed clusters
  - `GET /api/optimize/history/:promptId` - Get optimization history
  - `POST /api/optimize/compare` - Compare prompt performance
  - `POST /api/optimize/suggestions` - Get optimization suggestions
  - `POST /api/optimize/batch` - Batch optimize prompts

### 3. OptimizePromptService (`/src/services/OptimizePromptService.ts`)
- **Purpose**: Core optimization logic using LLM
- **Key Features**:
  - Analyzes failed test clusters
  - Generates optimized prompts using Gemini AI
  - Provides improvement suggestions
  - Handles cluster-specific optimizations

### 4. Validation Middleware
- **Purpose**: Validates optimization requests
- **Validates**:
  - Original prompt format and length
  - Failed clusters structure
  - Required fields and data types

## API Usage Examples

### Basic Optimization
```javascript
const response = await fetch('/api/optimize/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalPrompt: "Analyze user queries for energy services.",
    failedClusters: [
      {
        reason: "Empty cleanedQuery field when content should be preserved",
        failedTestCases: [
          {
            assertion: { type: "llm-rubric", value: "Evaluate accuracy" },
            pass: false,
            score: 3,
            reason: "Missing required output field",
            tokensUsed: { total: 1813, prompt: 410, completion: 133, cached: 0, completionDetails: { reasoning: 0, acceptedPrediction: 0, rejectedPrediction: 0 } },
            input: "My electricity bill is high",
            expectedOutput: "electricity bill inquiry",
            output: ""
          }
        ],
        prompt: "You are an expert query analysis system."
      }
    ],
    promptId: "energy-analyzer-v1"
  })
});

const result = await response.json();
console.log('Optimized prompt:', result.data.optimizedPrompt);
```

### Integration with Evaluation Flow
```javascript
// Complete workflow: Evaluate → Cluster → Optimize → Re-evaluate
async function improvePromptWorkflow(originalPrompt, testCases) {
  // 1. Run initial evaluation
  const evaluation = await fetch('/api/evaluations/run', {
    method: 'POST',
    body: JSON.stringify({
      prompts: [originalPrompt],
      testCases: testCases,
      evaluationCriteria: ['accuracy', 'format']
    })
  });
  
  const evalResult = await evaluation.json();
  
  // 2. Extract failed clusters (assuming they're provided by evaluation)
  const failedClusters = evalResult.data.errorClusters || [];
  
  if (failedClusters.length > 0) {
    // 3. Optimize the prompt
    const optimization = await fetch('/api/optimize/prompt', {
      method: 'POST',
      body: JSON.stringify({
        originalPrompt,
        failedClusters,
        promptId: 'workflow-test'
      })
    });
    
    const optimizeResult = await optimization.json();
    
    // 4. Re-evaluate with optimized prompt
    const reEvaluation = await fetch('/api/evaluations/run', {
      method: 'POST',
      body: JSON.stringify({
        prompts: [optimizeResult.data.optimizedPrompt],
        testCases: testCases,
        evaluationCriteria: ['accuracy', 'format']
      })
    });
    
    return {
      original: evalResult,
      optimized: await reEvaluation.json(),
      improvements: optimizeResult.data.improvements
    };
  }
  
  return { message: "No optimization needed" };
}
```

## Data Flow

### 1. Input: Failed Test Clusters
```json
{
  "originalPrompt": "Analyze user queries.",
  "failedClusters": [
    {
      "reason": "Specific failure pattern description",
      "failedTestCases": [
        {
          "assertion": { "type": "llm-rubric", "value": "..." },
          "pass": false,
          "score": 3,
          "reason": "Detailed failure reason",
          "tokensUsed": { "total": 1813, ... },
          "input": "User input",
          "expectedOutput": "Expected result",
          "output": "Actual result"
        }
      ],
      "prompt": "Original prompt used"
    }
  ]
}
```

### 2. Processing: LLM Analysis
- Analyzes failure patterns across clusters
- Identifies common issues (format, context, accuracy)
- Generates targeted improvements
- Creates optimized prompt with specific fixes

### 3. Output: Optimized Prompt
```json
{
  "success": true,
  "data": {
    "originalPrompt": "Analyze user queries.",
    "optimizedPrompt": "You are an expert query analyzer. Follow these steps: 1) Parse the input carefully...",
    "improvements": [
      "Added step-by-step reasoning instructions",
      "Enhanced output format specifications",
      "Improved context handling"
    ],
    "metadata": {
      "originalLength": 25,
      "optimizedLength": 150,
      "clustersAnalyzed": 2,
      "optimizedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

## Features

### ✅ Implemented
- **Single Prompt Optimization**: Optimize individual prompts based on failures
- **Failure Analysis**: Analyze patterns in failed test clusters
- **Optimization History**: Track optimization attempts per prompt
- **Batch Processing**: Optimize multiple prompts simultaneously
- **Suggestions**: Get improvement suggestions without full optimization
- **Performance Comparison**: Compare original vs optimized prompts
- **Validation**: Comprehensive input validation
- **Error Handling**: Robust error handling and logging

### 🔄 Integration Points
- **Evaluation System**: Receives failed clusters from evaluations
- **Error Clustering**: Uses clustered failure analysis
- **Prompt Engineering**: Leverages existing prompt techniques
- **Google AI Service**: Uses Gemini for optimization generation

### 📊 Monitoring & Analytics
- **Optimization History**: Per-prompt optimization tracking
- **Performance Metrics**: Success rates, improvement percentages
- **Failure Pattern Analysis**: Common failure types and frequencies
- **Usage Statistics**: API endpoint usage and performance

## Environment Setup

Required environment variables:
```bash
GEMINI_API_KEY=your_google_ai_api_key
```

## Testing

Run the optimization flow tests:
```bash
# Build the project
npm run build

# Start the server
npm run dev

# Test the endpoints (in another terminal)
curl -X POST http://localhost:3001/api/optimize/suggestions \
  -H "Content-Type: application/json" \
  -d '{"originalPrompt":"Test prompt","failedClusters":[]}'
```

## Future Enhancements

1. **A/B Testing Integration**: Automatically test optimized vs original prompts
2. **Machine Learning**: Learn from optimization patterns to improve suggestions
3. **Template Library**: Build a library of optimization patterns
4. **Real-time Optimization**: Optimize prompts during evaluation runs
5. **Performance Prediction**: Predict optimization success before applying
6. **Custom Optimization Rules**: Allow users to define optimization preferences

## Error Handling

The system handles various error scenarios:
- Invalid prompt formats
- Missing required fields
- API rate limits
- LLM generation failures
- Network timeouts

All errors are logged and return structured error responses for debugging.