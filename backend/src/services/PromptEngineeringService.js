const GoogleAIService = require('./GoogleAIService');
const logger = require('../utils/logger');

class PromptEngineeringService {
  constructor() {
    this.aiService = new GoogleAIService();
    this.techniques = {
      'few-shot': this.generateFewShotPrompt.bind(this),
      'chain-of-thought': this.generateChainOfThoughtPrompt.bind(this),
      'zero-shot': this.generateZeroShotPrompt.bind(this),
      'role-based': this.generateRoleBasedPrompt.bind(this),
      'template-based': this.generateTemplateBasedPrompt.bind(this),
      'iterative-refinement': this.generateIterativeRefinementPrompt.bind(this)
    };
  }

  async generatePrompts(query, context, expectedOutput, techniques = null, parameters = {}) {
    try {
      const techniquesToUse = techniques || Object.keys(this.techniques);
      const results = {};

      for (const technique of techniquesToUse) {
        if (this.techniques[technique]) {
          logger.info(`Generating prompt using technique: ${technique}`);
          
          try {
            const promptData = await this.techniques[technique](
              query, 
              context, 
              expectedOutput, 
              parameters
            );
            
            results[technique] = {
              success: true,
              ...promptData,
              metadata: {
                technique,
                generatedAt: new Date().toISOString(),
                parameters: parameters[technique] || {}
              }
            };
          } catch (error) {
            logger.error(`Error generating ${technique} prompt:`, error);
            results[technique] = {
              success: false,
              error: error.message,
              technique
            };
          }
        }
      }

      return results;
    } catch (error) {
      logger.error('Error in generatePrompts:', error);
      throw error;
    }
  }

  async generateFewShotPrompt(query, context, expectedOutput, parameters = {}) {
    const numExamples = parameters.numExamples || 3;
    
    const metaPrompt = `
Create a few-shot learning prompt for the following task:

Task: ${query}
Context: ${context || 'No additional context provided'}
Expected Output Format: ${expectedOutput}

Generate a prompt that includes ${numExamples} high-quality examples that demonstrate the pattern the AI should follow. 

The prompt should:
1. Clearly explain the task
2. Provide ${numExamples} diverse, relevant examples
3. End with a clear instruction for the new input
4. Follow this structure:

Task: [Brief description]
Examples:
Input: [example 1 input]
Output: [example 1 output]

Input: [example 2 input]  
Output: [example 2 output]

[Continue for ${numExamples} examples]

Now complete this:
Input: [USER_INPUT_PLACEHOLDER]
Output:

Make sure the examples are realistic and demonstrate the expected output format clearly.
`;

    const generatedPrompt = await this.aiService.generateContent(metaPrompt);
    
    return {
      prompt: generatedPrompt,
      technique: 'few-shot',
      description: `Few-shot learning prompt with ${numExamples} examples`,
      usage: 'Replace [USER_INPUT_PLACEHOLDER] with actual user input'
    };
  }

  async generateChainOfThoughtPrompt(query, context, expectedOutput, parameters = {}) {
    const reasoningSteps = parameters.reasoningSteps || 3;
    
    const metaPrompt = `
Create a chain-of-thought prompt for the following task:

Task: ${query}
Context: ${context || 'No additional context provided'}
Expected Output Format: ${expectedOutput}

Generate a prompt that encourages step-by-step reasoning with approximately ${reasoningSteps} reasoning steps.

The prompt should:
1. Clearly explain the task
2. Explicitly ask for step-by-step thinking
3. Provide guidance on the reasoning process
4. Include phrases like "Let's think step by step" or "Let's break this down"
5. Ask for the reasoning to be shown before the final answer

Structure the prompt to guide the AI through logical reasoning steps that lead to the expected output format.
`;

    const generatedPrompt = await this.aiService.generateContent(metaPrompt);
    
    return {
      prompt: generatedPrompt,
      technique: 'chain-of-thought',
      description: `Chain-of-thought prompt encouraging ${reasoningSteps}-step reasoning`,
      usage: 'AI will show reasoning process before providing final answer'
    };
  }

  async generateZeroShotPrompt(query, context, expectedOutput, parameters = {}) {
    const tone = parameters.tone || 'professional';
    
    const metaPrompt = `
Create a zero-shot prompt for the following task:

Task: ${query}
Context: ${context || 'No additional context provided'}
Expected Output Format: ${expectedOutput}
Tone: ${tone}

Generate a direct, clear prompt without examples that:
1. Clearly states the task
2. Provides necessary context
3. Specifies the expected output format
4. Uses a ${tone} tone
5. Is concise but comprehensive
6. Includes any necessary constraints or requirements

The prompt should be self-contained and enable the AI to complete the task without additional examples.
`;

    const generatedPrompt = await this.aiService.generateContent(metaPrompt);
    
    return {
      prompt: generatedPrompt,
      technique: 'zero-shot',
      description: `Direct zero-shot prompt with ${tone} tone`,
      usage: 'Direct instruction without examples'
    };
  }

  async generateRoleBasedPrompt(query, context, expectedOutput, parameters = {}) {
    const role = parameters.role || 'expert';
    
    const metaPrompt = `
Create a role-based prompt for the following task:

Task: ${query}
Context: ${context || 'No additional context provided'}
Expected Output Format: ${expectedOutput}
Role: ${role}

Generate a prompt that:
1. Assigns a specific role or persona to the AI (${role})
2. Explains the task from that role's perspective
3. Includes role-appropriate language and expertise
4. Leverages the role's knowledge and perspective
5. Maintains consistency with the assigned role throughout

The role should enhance the AI's ability to complete the task effectively.
`;

    const generatedPrompt = await this.aiService.generateContent(metaPrompt);
    
    return {
      prompt: generatedPrompt,
      technique: 'role-based',
      description: `Role-based prompt with ${role} persona`,
      usage: `AI will respond as a ${role}`
    };
  }

  async generateTemplateBasedPrompt(query, context, expectedOutput, parameters = {}) {
    const templateStructure = parameters.templateStructure || 'structured';
    
    const metaPrompt = `
Create a template-based prompt for the following task:

Task: ${query}
Context: ${context || 'No additional context provided'}
Expected Output Format: ${expectedOutput}
Template Structure: ${templateStructure}

Generate a structured template prompt that:
1. Uses clear sections and formatting
2. Includes placeholders for variable content
3. Provides a ${templateStructure} approach
4. Uses consistent formatting (headers, bullets, etc.)
5. Makes it easy to fill in specific information
6. Ensures reproducible results

The template should be reusable for similar tasks with different inputs.
`;

    const generatedPrompt = await this.aiService.generateContent(metaPrompt);
    
    return {
      prompt: generatedPrompt,
      technique: 'template-based',
      description: `Structured template with ${templateStructure} format`,
      usage: 'Fill in template placeholders with specific information'
    };
  }

  async generateIterativeRefinementPrompt(query, context, expectedOutput, parameters = {}) {
    const iterations = parameters.iterations || 2;
    
    const metaPrompt = `
Create an iterative refinement prompt for the following task:

Task: ${query}
Context: ${context || 'No additional context provided'}
Expected Output Format: ${expectedOutput}
Number of iterations: ${iterations}

Generate a prompt that:
1. Asks the AI to create an initial response
2. Then asks it to review and improve that response ${iterations} times
3. Includes specific criteria for improvement
4. Encourages self-reflection and refinement
5. Results in progressively better outputs
6. Clearly separates each iteration

The prompt should guide the AI through a process of continuous improvement.
`;

    const generatedPrompt = await this.aiService.generateContent(metaPrompt);
    
    return {
      prompt: generatedPrompt,
      technique: 'iterative-refinement',
      description: `Iterative refinement with ${iterations} improvement cycles`,
      usage: 'AI will self-improve response through multiple iterations'
    };
  }

  getAvailableTechniques() {
    return Object.keys(this.techniques).map(technique => ({
      name: technique,
      description: this.getTechniqueDescription(technique)
    }));
  }

  getTechniqueDescription(technique) {
    const descriptions = {
      'few-shot': 'Provides examples to guide the model toward the desired output pattern',
      'chain-of-thought': 'Encourages step-by-step reasoning and logical thinking',
      'zero-shot': 'Direct instruction without examples, relying on the model\'s training',
      'role-based': 'Assigns a specific role or persona to enhance task performance',
      'template-based': 'Uses structured templates for consistent, reproducible outputs',
      'iterative-refinement': 'Progressively improves responses through self-reflection'
    };
    
    return descriptions[technique] || 'No description available';
  }
}

module.exports = PromptEngineeringService;
