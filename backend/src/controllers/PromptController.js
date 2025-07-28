const PromptEngineeringService = require('../services/PromptEngineeringService');
const GoogleAIService = require('../services/GoogleAIService');
const logger = require('../utils/logger');

class PromptController {
  constructor() {
    this.promptService = new PromptEngineeringService();
    this.aiService = new GoogleAIService();
  }

  // Generate prompt variations using different techniques
  async generatePrompts(req, res) {
    try {
      const { query, context, expectedOutput, techniques, parameters = {} } = req.body;

      logger.info('Generating prompts for query:', { 
        query: query.substring(0, 100),
        techniques: techniques || 'all',
        hasContext: !!context
      });

      const results = await this.promptService.generatePrompts(
        query,
        context,
        expectedOutput,
        techniques,
        parameters
      );

      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;

      res.status(200).json({
        success: true,
        data: {
          results,
          summary: {
            totalTechniques: totalCount,
            successfulTechniques: successCount,
            failedTechniques: totalCount - successCount,
            generatedAt: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      logger.error('Error in generatePrompts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate prompts',
        message: error.message
      });
    }
  }

  // Get available prompt engineering techniques
  async getTechniques(req, res) {
    try {
      const techniques = this.promptService.getAvailableTechniques();
      
      res.status(200).json({
        success: true,
        data: {
          techniques,
          count: techniques.length
        }
      });

    } catch (error) {
      logger.error('Error in getTechniques:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve techniques',
        message: error.message
      });
    }
  }

  // Evaluate prompt effectiveness
  async evaluatePrompt(req, res) {
    try {
      const { prompt, expectedOutput, actualOutput } = req.body;

      logger.info('Evaluating prompt effectiveness');

      const evaluation = await this.aiService.evaluatePromptEffectiveness(
        prompt,
        expectedOutput,
        actualOutput
      );

      res.status(200).json({
        success: true,
        data: {
          evaluation,
          evaluatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in evaluatePrompt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to evaluate prompt',
        message: error.message
      });
    }
  }

  // Test a generated prompt
  async testPrompt(req, res) {
    try {
      const { prompt, testInput, options = {} } = req.body;

      if (!prompt || !testInput) {
        return res.status(400).json({
          success: false,
          error: 'Prompt and testInput are required'
        });
      }

      logger.info('Testing prompt with input');

      // Replace placeholder with actual input
      const finalPrompt = prompt.replace(/\[USER_INPUT_PLACEHOLDER\]/g, testInput);

      const result = await this.aiService.generateContent(finalPrompt, options);

      res.status(200).json({
        success: true,
        data: {
          input: testInput,
          output: result,
          prompt: finalPrompt,
          testedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in testPrompt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test prompt',
        message: error.message
      });
    }
  }

  // Generate variations of a single prompt
  async generateVariations(req, res) {
    try {
      const { prompt, count = 3, options = {} } = req.body;

      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required'
        });
      }

      logger.info(`Generating ${count} variations of prompt`);

      const variations = await this.aiService.generateMultipleVariations(
        prompt,
        count,
        options
      );

      res.status(200).json({
        success: true,
        data: {
          originalPrompt: prompt,
          variations: variations.map((variation, index) => ({
            id: index + 1,
            content: variation,
            parameters: {
              ...options,
              temperature: (options.temperature || 0.7) + (index * 0.1)
            }
          })),
          count: variations.length,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in generateVariations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate variations',
        message: error.message
      });
    }
  }

  // Optimize an existing prompt
  async optimizePrompt(req, res) {
    try {
      const { prompt, issues, targetImprovement } = req.body;

      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required'
        });
      }

      logger.info('Optimizing prompt based on issues');

      const optimizationPrompt = `
Optimize the following prompt to address these issues:

Original Prompt: "${prompt}"
Issues to Address: ${issues || 'General improvement needed'}
Target Improvement: ${targetImprovement || 'Better clarity and effectiveness'}

Please provide:
1. An improved version of the prompt
2. Explanation of changes made
3. Expected benefits of the optimization

Format your response as JSON:
{
  "optimizedPrompt": "improved prompt here",
  "changes": ["change 1", "change 2", ...],
  "benefits": ["benefit 1", "benefit 2", ...],
  "reasoning": "detailed explanation"
}
`;

      const result = await this.aiService.generateContent(optimizationPrompt, {
        temperature: 0.3
      });

      try {
        const optimization = JSON.parse(result);
        res.status(200).json({
          success: true,
          data: {
            original: prompt,
            optimization,
            optimizedAt: new Date().toISOString()
          }
        });
      } catch (parseError) {
        res.status(200).json({
          success: true,
          data: {
            original: prompt,
            optimization: { raw: result },
            optimizedAt: new Date().toISOString()
          }
        });
      }

    } catch (error) {
      logger.error('Error in optimizePrompt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to optimize prompt',
        message: error.message
      });
    }
  }
}

module.exports = PromptController;
