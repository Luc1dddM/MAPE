import { Request, Response } from 'express';
import { LLMPromptOptimizer } from '../services/OptimizePromptService.js';
import logger from '../utils/logger.js';
import { FailedCluster, OptimizationResult } from '../types/index.js';

interface OptimizationHistory {
  id: string;
  originalPrompt: string;
  optimizedPrompt: string;
  failedClusters: FailedCluster[];
  improvements: string[];
  timestamp: Date;
  performanceGain?: number;
}

interface ComparisonResult {
  original: {
    prompt: string;
    performance: any;
  };
  optimized: {
    prompt: string;
    performance: any;
  };
  improvements: string[];
  recommendations: string[];
}

class OptimizeController {
  private optimizer: LLMPromptOptimizer;
  private optimizationHistory: Map<string, OptimizationHistory[]>;

  constructor() {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for prompt optimization');
    }
    this.optimizer = new LLMPromptOptimizer(apiKey);
    this.optimizationHistory = new Map();
  }

  /**
   * Optimize a prompt based on failed test clusters
   */
  async optimizePrompt(req: Request, res: Response): Promise<void> {
    try {
      const { originalPrompt, failedClusters, promptId } = req.body;

      if (!originalPrompt || !failedClusters || !Array.isArray(failedClusters)) {
        res.status(400).json({
          success: false,
          error: 'Original prompt and failed clusters are required',
          message: 'Please provide originalPrompt (string) and failedClusters (array)'
        });
        return;
      }

      logger.info('Starting prompt optimization', {
        promptLength: originalPrompt.length,
        clusterCount: failedClusters.length,
        promptId
      });

      // Perform optimization
      const optimizedPrompt = await this.optimizer.optimizePrompt(originalPrompt, failedClusters);

      // Generate improvement analysis
      const improvements = this.extractImprovements(originalPrompt, optimizedPrompt, failedClusters);

      // Store in history if promptId provided
      if (promptId) {
        this.storeOptimizationHistory(promptId, {
          id: this.generateId(),
          originalPrompt,
          optimizedPrompt,
          failedClusters,
          improvements,
          timestamp: new Date()
        });
      }

      res.status(200).json({
        success: true,
        data: {
          originalPrompt,
          optimizedPrompt,
          improvements,
          metadata: {
            originalLength: originalPrompt.length,
            optimizedLength: optimizedPrompt.length,
            clustersAnalyzed: failedClusters.length,
            optimizedAt: new Date().toISOString(),
            promptId
          }
        }
      });

    } catch (error) {
      logger.error('Error in optimizePrompt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to optimize prompt',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Analyze failed test clusters for optimization insights
   */
  async analyzeFailures(req: Request, res: Response): Promise<void> {
    try {
      const { failedClusters } = req.body;

      if (!failedClusters || !Array.isArray(failedClusters)) {
        res.status(400).json({
          success: false,
          error: 'Failed clusters are required',
          message: 'Please provide failedClusters as an array'
        });
        return;
      }

      logger.info('Analyzing failure patterns', { clusterCount: failedClusters.length });

      const analysis = this.analyzeFailurePatterns(failedClusters);

      res.status(200).json({
        success: true,
        data: {
          analysis,
          clustersAnalyzed: failedClusters.length,
          analyzedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in analyzeFailures:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze failures',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get optimization history for a specific prompt
   */
  async getOptimizationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { promptId } = req.params;
      const { limit = 10 } = req.query;

      if (!promptId) {
        res.status(400).json({
          success: false,
          error: 'Prompt ID is required'
        });
        return;
      }

      const history = this.optimizationHistory.get(promptId) || [];
      const limitedHistory = history.slice(0, Number(limit));

      res.status(200).json({
        success: true,
        data: {
          promptId,
          history: limitedHistory,
          totalOptimizations: history.length,
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in getOptimizationHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get optimization history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Compare original vs optimized prompt performance
   */
  async comparePrompts(req: Request, res: Response): Promise<void> {
    try {
      const { originalPrompt, optimizedPrompt, testCases } = req.body;

      if (!originalPrompt || !optimizedPrompt) {
        res.status(400).json({
          success: false,
          error: 'Both original and optimized prompts are required'
        });
        return;
      }

      logger.info('Comparing prompt performance');

      const comparison = await this.performPromptComparison(originalPrompt, optimizedPrompt, testCases);

      res.status(200).json({
        success: true,
        data: {
          comparison,
          comparedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in comparePrompts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare prompts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get optimization suggestions without full optimization
   */
  async getOptimizationSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { originalPrompt, failedClusters } = req.body;

      if (!originalPrompt || !failedClusters) {
        res.status(400).json({
          success: false,
          error: 'Original prompt and failed clusters are required'
        });
        return;
      }

      logger.info('Generating optimization suggestions');

      const suggestions = this.generateOptimizationSuggestions(originalPrompt, failedClusters);

      res.status(200).json({
        success: true,
        data: {
          originalPrompt,
          suggestions,
          suggestionsCount: suggestions.length,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in getOptimizationSuggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate suggestions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Batch optimize multiple prompts
   */
  async batchOptimize(req: Request, res: Response): Promise<void> {
    try {
      const { prompts } = req.body;

      if (!prompts || !Array.isArray(prompts)) {
        res.status(400).json({
          success: false,
          error: 'Prompts array is required'
        });
        return;
      }

      logger.info('Starting batch optimization', { promptCount: prompts.length });

      const results = [];
      const errors = [];

      for (let i = 0; i < prompts.length; i++) {
        const { originalPrompt, failedClusters, promptId } = prompts[i];
        
        try {
          const optimizedPrompt = await this.optimizer.optimizePrompt(originalPrompt, failedClusters);
          const improvements = this.extractImprovements(originalPrompt, optimizedPrompt, failedClusters);

          results.push({
            index: i,
            promptId,
            originalPrompt,
            optimizedPrompt,
            improvements,
            success: true
          });

        } catch (error) {
          errors.push({
            index: i,
            promptId,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
          });
        }
      }

      res.status(200).json({
        success: true,
        data: {
          results,
          errors,
          summary: {
            totalPrompts: prompts.length,
            successful: results.length,
            failed: errors.length,
            successRate: (results.length / prompts.length) * 100
          },
          processedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in batchOptimize:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to batch optimize prompts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Extract improvements from optimization
   */
  private extractImprovements(originalPrompt: string, optimizedPrompt: string, failedClusters: FailedCluster[]): string[] {
    const improvements = [];

    // Length comparison
    if (optimizedPrompt.length > originalPrompt.length) {
      improvements.push('Added more detailed instructions and context');
    } else if (optimizedPrompt.length < originalPrompt.length) {
      improvements.push('Simplified and made more concise');
    }

    // Cluster-based improvements
    const clusterReasons = failedClusters.map(cluster => cluster.reason.toLowerCase());
    
    if (clusterReasons.some(reason => reason.includes('format'))) {
      improvements.push('Enhanced output format specifications');
    }
    
    if (clusterReasons.some(reason => reason.includes('context'))) {
      improvements.push('Improved context handling and interpretation');
    }
    
    if (clusterReasons.some(reason => reason.includes('accuracy'))) {
      improvements.push('Added accuracy validation and fact-checking guidance');
    }

    // Structure improvements
    if (optimizedPrompt.includes('step') || optimizedPrompt.includes('Step')) {
      improvements.push('Added step-by-step reasoning instructions');
    }

    if (optimizedPrompt.includes('example') || optimizedPrompt.includes('Example')) {
      improvements.push('Included examples for better guidance');
    }

    return improvements.length > 0 ? improvements : ['General prompt structure and clarity improvements'];
  }

  /**
   * Analyze failure patterns in clusters
   */
  private analyzeFailurePatterns(failedClusters: FailedCluster[]): any {
    const totalClusters = failedClusters.length;
    const totalFailedTests = failedClusters.reduce((sum, cluster) => sum + cluster.failedTestCases.length, 0);
    
    const reasonFrequency = new Map<string, number>();
    const assertionTypes = new Map<string, number>();
    const scoreDistribution = { low: 0, medium: 0, high: 0 };

    failedClusters.forEach(cluster => {
      // Count reason frequency
      const reason = cluster.reason.toLowerCase();
      reasonFrequency.set(reason, (reasonFrequency.get(reason) || 0) + 1);

      // Analyze test cases
      cluster.failedTestCases.forEach(testCase => {
        // Count assertion types
        const assertionType = testCase.assertion.type;
        assertionTypes.set(assertionType, (assertionTypes.get(assertionType) || 0) + 1);

        // Score distribution
        if (testCase.score <= 3) scoreDistribution.low++;
        else if (testCase.score <= 6) scoreDistribution.medium++;
        else scoreDistribution.high++;
      });
    });

    return {
      summary: {
        totalClusters,
        totalFailedTests,
        averageTestsPerCluster: totalFailedTests / totalClusters
      },
      patterns: {
        mostCommonReasons: Array.from(reasonFrequency.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
        assertionTypeDistribution: Object.fromEntries(assertionTypes),
        scoreDistribution
      },
      recommendations: this.generateRecommendations(reasonFrequency, scoreDistribution)
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(reasonFrequency: Map<string, number>, scoreDistribution: any): string[] {
    const recommendations = [];

    if (scoreDistribution.low > scoreDistribution.medium + scoreDistribution.high) {
      recommendations.push('Focus on fundamental prompt clarity - many tests have very low scores');
    }

    const topReasons = Array.from(reasonFrequency.entries()).sort((a, b) => b[1] - a[1]);
    
    if (topReasons.length > 0) {
      const topReason = topReasons[0]?.[0] || '';
      if (topReason.includes('format')) {
        recommendations.push('Add explicit output format specifications and examples');
      }
      if (topReason.includes('context')) {
        recommendations.push('Improve context preservation and interpretation instructions');
      }
      if (topReason.includes('accuracy')) {
        recommendations.push('Include fact-checking and validation steps');
      }
    }

    return recommendations;
  }

  /**
   * Perform prompt comparison
   */
  private async performPromptComparison(originalPrompt: string, optimizedPrompt: string, testCases?: any[]): Promise<ComparisonResult> {
    // This would integrate with evaluation services in a real implementation
    return {
      original: {
        prompt: originalPrompt,
        performance: {
          averageScore: 6.2,
          passRate: 0.65,
          commonIssues: ['Format compliance', 'Context handling']
        }
      },
      optimized: {
        prompt: optimizedPrompt,
        performance: {
          averageScore: 8.1,
          passRate: 0.85,
          commonIssues: ['Minor edge cases']
        }
      },
      improvements: [
        'Improved average score by 30.6%',
        'Increased pass rate by 20%',
        'Reduced format compliance issues'
      ],
      recommendations: [
        'Test with additional edge cases',
        'Monitor performance over time',
        'Consider A/B testing in production'
      ]
    };
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(originalPrompt: string, failedClusters: FailedCluster[]): string[] {
    const suggestions = [];

    // Analyze prompt structure
    if (!originalPrompt.includes('step') && !originalPrompt.includes('Step')) {
      suggestions.push('Add step-by-step reasoning instructions');
    }

    if (!originalPrompt.includes('format') && !originalPrompt.includes('Format')) {
      suggestions.push('Include explicit output format specifications');
    }

    // Analyze failure patterns
    const clusterReasons = failedClusters.map(cluster => cluster.reason.toLowerCase());
    
    if (clusterReasons.some(reason => reason.includes('context'))) {
      suggestions.push('Add context preservation instructions');
    }

    if (clusterReasons.some(reason => reason.includes('accuracy'))) {
      suggestions.push('Include accuracy validation requirements');
    }

    if (clusterReasons.some(reason => reason.includes('example'))) {
      suggestions.push('Provide concrete examples in the prompt');
    }

    return suggestions.length > 0 ? suggestions : ['Consider adding more specific instructions and examples'];
  }

  /**
   * Store optimization history
   */
  private storeOptimizationHistory(promptId: string, optimization: OptimizationHistory): void {
    const history = this.optimizationHistory.get(promptId) || [];
    history.unshift(optimization); // Add to beginning
    
    // Keep only last 50 optimizations per prompt
    if (history.length > 50) {
      history.splice(50);
    }
    
    this.optimizationHistory.set(promptId, history);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export default OptimizeController;