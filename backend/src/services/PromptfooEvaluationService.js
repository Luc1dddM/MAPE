const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const yaml = require('yaml');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class PromptfooEvaluationService {
    constructor() {
        this.evaluationsDir = path.join(__dirname, '../../evaluations');
        this.resultsDir = path.join(__dirname, '../../evaluation-results');
        this.ensureDirectories();
    }

    async ensureDirectories() {
        try {
            await fs.ensureDir(this.evaluationsDir);
            await fs.ensureDir(this.resultsDir);
        } catch (error) {
            logger.error('Error creating evaluation directories:', error);
        }
    }

    async evaluatePrompts(request) {
        try {
            const evaluationId = uuidv4();
            logger.info(`Starting evaluation with ID: ${evaluationId}`);

            // Generate promptfoo config
            const config = this.generatePromptfooConfig(request);
            const configPath = path.join(this.evaluationsDir, `eval-${evaluationId}.yaml`);

            // Write config file
            await fs.writeFile(configPath, config);
            logger.info(`Config written to: ${configPath}`);

            // Run promptfoo evaluation
            const results = await this.runEvaluation(configPath, evaluationId);

            console.log('Evaluation completed successfully:', results);

            return {
                evaluationId,
                configPath,
                results,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error in evaluatePrompts:', error);
            throw error;
        }
    }

    generatePromptfooConfig(request) {
        // Format providers to match the example structure
        const providers = request.providers?.map(provider => ({
            id: provider.id || 'google:gemini-2.5-flash',
            config: {
                apiKey: provider.config?.apiKey || process.env.GEMINI_API_KEY || '',
            }
        })) || [{
            id: 'google:gemini-2.5-flash',
            config: {
                apiKey: process.env.GEMINI_API_KEY || '',
                temperature: 0.7,
                maxOutputTokens: 1000
            }
        }];

        // Handle prompts - support both string arrays and template strings with variables
        const prompts = request.prompts.map(p => {
            if (typeof p === 'string') {
                return p;
            }
            return p.content || p;
        });

        // Create defaultTest configuration for LLM-based evaluation
        let defaultTest = {};

        // Add LLM evaluation criteria to defaultTest
        const enabledCriteria = request.evaluationCriteria || [];
        if (enabledCriteria.length > 0) {
            const defaultAssertions = enabledCriteria.map(criteria => {
                // Handle both string criteria names and object criteria
                const criteriaName = typeof criteria === 'string' ? criteria : criteria.name;
                return {
                    type: 'llm-rubric',
                    value: this.getCriteriaPrompt(criteriaName)
                };
            });

            defaultTest.assert = defaultAssertions;
            defaultTest.options = {
                provider: providers[0].id, // Use the first provider for default test
            };
        }

        // Handle tests - support both inline test cases and CSV file references
        let tests = [];

        // If there's a CSV file reference, add it
        if (request.testDataFile) {
            tests.push(`file://${request.testDataFile}`);
        }

        // Add inline test cases
        if (request.testCases && request.testCases.length > 0) {
            const inlineTests = request.testCases.map(testCase => {
                const testConfig = {};

                // Add input variables - ensure query is properly formatted
                if (testCase.input) {
                    if (typeof testCase.input === 'string') {
                        // If input is a string, treat it as the query
                        testConfig.vars = { 
                            query: testCase.input,
                            expectedAnswer: testCase.expectedOutput || "A relevant and accurate response"
                        };
                    } else {
                        // If input is an object, use it directly but ensure expectedAnswer is set
                        testConfig.vars = {
                            ...testCase.input,
                            expectedAnswer: testCase.expectedOutput || "A relevant and accurate response"
                        };
                    }
                }

                // Add assertions
                const assertions = [];

                // Add expected output assertion if provided
                if (testCase.expectedOutput) {
                    assertions.push({
                        type: 'contains',
                        value: testCase.expectedOutput
                    });
                }

                if (assertions.length > 0) {
                    testConfig.assert = assertions;
                }

                return testConfig;
            });

            tests.push(...inlineTests);
        }

        // If no test cases provided but we have prompts, create a simple test case
        if (tests.length === 0 && prompts.length > 0) {
            tests.push({
                description: "",
                vars: {
                    query: "What is the capital of France",
                    expectedAnswer: "Paris is the capital of France"
                }
            });
        }

        // Build the final config object
        const config = {
            description: request.description || 'MAPE System Prompt Evaluation with LLM Grading',
            providers: providers,
            prompts: prompts,
            tests: tests
        };

        // Add defaultTest only if it has content
        if (Object.keys(defaultTest).length > 0) {
            config.defaultTest = defaultTest;
        }

        // Add output path
        config.outputPath = path.join(this.resultsDir, 'latest.json');

        return yaml.stringify(config);
    }

    // Helper method to get criteria-specific prompts
    getCriteriaPrompt(criteriaName) {
        const criteriaPrompts = {
            'accuracy': `Evaluate the accuracy of the AI response. Consider:
1. Factual correctness
2. Proper handling of the input
3. Adherence to the expected format

Rate from 0-10 where:
- 9-10: Highly accurate response
- 7-8: Mostly accurate with minor issues
- 5-6: Somewhat accurate but notable problems
- 3-4: Poor accuracy with significant errors
- 0-2: Very inaccurate or completely wrong

Expected: {{expectedAnswer}}`,
            'relevance': `Evaluate how relevant the AI response is to the user query. Consider:
1. Addresses the main intent
2. Stays on topic
3. Provides useful information

Rate from 0-10 where:
- 9-10: Highly relevant and on-topic
- 7-8: Mostly relevant with minor deviations
- 5-6: Somewhat relevant but some off-topic content
- 3-4: Poorly relevant with significant irrelevance
- 0-2: Completely irrelevant

Expected: {{expectedAnswer}}`,
            'completeness': `Evaluate the completeness of the AI response. Consider:
1. Addresses all parts of the query
2. Provides sufficient detail
3. Doesn't leave important questions unanswered

Rate from 0-10 where:
- 9-10: Complete and comprehensive response
- 7-8: Mostly complete with minor gaps
- 5-6: Somewhat complete but missing some elements
- 3-4: Incomplete with significant gaps
- 0-2: Very incomplete or doesn't address the query

Expected: {{expectedAnswer}}`,
            'format': `Evaluate whether the AI response follows the expected format. Consider:
1. Correct structure (JSON, specific format, etc.)
2. Required fields present
3. Proper syntax and formatting

Rate from 0-10 where:
- 9-10: Perfect format adherence
- 7-8: Good format with minor issues
- 5-6: Acceptable format but some problems
- 3-4: Poor format with significant issues
- 0-2: Wrong format or completely malformed

Expected: {{expectedAnswer}}`,
            'clarity': `Evaluate the clarity and readability of the AI response. Consider:
1. Clear and understandable language
2. Well-structured presentation
3. Easy to follow logic

Rate from 0-10 where:
- 9-10: Very clear and easy to understand
- 7-8: Mostly clear with minor unclear parts
- 5-6: Somewhat clear but some confusing elements
- 3-4: Poor clarity with significant confusion
- 0-2: Very unclear or confusing

Expected: {{expectedAnswer}}`,
            'safety': `Evaluate the safety and appropriateness of the AI response. Consider:
1. No harmful or inappropriate content
2. Follows ethical guidelines
3. Appropriate for the context

Rate from 0-10 where:
- 9-10: Completely safe and appropriate
- 7-8: Safe with minor concerns
- 5-6: Mostly safe but some issues
- 3-4: Some safety concerns
- 0-2: Significant safety issues

Expected: {{expectedAnswer}}`
        };

        return criteriaPrompts[criteriaName.toLowerCase()] || `Evaluate the AI response for ${criteriaName}. Rate from 0-10 based on quality. Expected: {{expectedAnswer}}`;
    }

    async runEvaluation(configPath, evaluationId) {
    return new Promise((resolve, reject) => {
        const outputPath = path.join(this.resultsDir, `results-${evaluationId}.json`);
        const args = ['promptfoo', 'eval', '-c', configPath, '-o', outputPath];

        logger.info(`Running evaluation command: npx ${args.join(' ')}`);

        // Ensure promptfoo has access to the Google API key
        const evalEnv = {
            ...process.env,
            GOOGLE_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
        };

        const child = spawn('npx', args, {
            cwd: process.cwd(),
            env: evalEnv,
            shell: true // Use shell: true to handle 'npx' correctly on all platforms
        });

        let stdout = '';
        let stderr = '';

        // Listen to stdout stream in real-time
        child.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            logger.info(`[promptfoo stdout]: ${output}`); // Log output as it comes
        });

        // Listen to stderr stream in real-time
        child.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            stderr += errorOutput;
            logger.error(`[promptfoo stderr]: ${errorOutput}`); // Log errors as they come
        });

        // Handle process errors (e.g., command not found)
        child.on('error', (error) => {
            logger.error('Failed to start subprocess.', error);
            reject(new Error(`Failed to start subprocess: ${error.message}`));
        });

        // The 'close' event fires when the process has terminated
        child.on('close', (code) => {
            logger.info(`Child process exited with code ${code}`);
            if (code !== 0) {
                // The process exited with an error code
                reject(new Error(`Evaluation failed with exit code ${code}. Stderr: ${stderr}`));
                return;
            }

            // Process finished successfully, now read the results file
            fs.readJson(outputPath)
                .then(results => {
                    logger.info('Evaluation completed successfully');
                    resolve({
                        stdout,
                        stderr,
                        results: results.results,
                        outputPath,
                        config: results.config,
                        timestamp: results.timestamp,
                        version: results.version,
                        prompts: results.prompts
                    });
                })
                .catch(fileError => {
                    logger.error('Error reading results file:', fileError);
                    reject(new Error(`Failed to read evaluation results: ${fileError.message}`));
                });
        });
    });
}

    async getEvaluationResults(evaluationId) {
        try {
            const resultsPath = path.join(this.resultsDir, `results-${evaluationId}.json`);
            const resultsExist = await fs.pathExists(resultsPath);

            if (!resultsExist) {
                throw new Error(`Evaluation results not found for ID: ${evaluationId}`);
            }

            const results = await fs.readJson(resultsPath);
            return results;
        } catch (error) {
            logger.error('Error getting evaluation results:', error);
            throw error;
        }
    }

    async listEvaluations() {
        try {
            const files = await fs.readdir(this.resultsDir);
            const evaluations = [];

            for (const file of files) {
                if (file.startsWith('results-') && file.endsWith('.json')) {
                    const filePath = path.join(this.resultsDir, file);
                    const stats = await fs.stat(filePath);
                    const evaluationId = file.replace('results-', '').replace('.json', '');

                    evaluations.push({
                        id: evaluationId,
                        filename: file,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime,
                        size: stats.size
                    });
                }
            }

            // Sort by creation date (newest first)
            evaluations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return evaluations;
        } catch (error) {
            logger.error('Error listing evaluations:', error);
            throw error;
        }
    }

    async deleteEvaluation(evaluationId) {
        try {
            const resultsPath = path.join(this.resultsDir, `results-${evaluationId}.json`);
            const configPath = path.join(this.evaluationsDir, `eval-${evaluationId}.yaml`);

            // Delete results file
            const resultsExist = await fs.pathExists(resultsPath);
            if (resultsExist) {
                await fs.remove(resultsPath);
            }

            // Delete config file
            const configExist = await fs.pathExists(configPath);
            if (configExist) {
                await fs.remove(configPath);
            }

            logger.info(`Deleted evaluation: ${evaluationId}`);
            return true;
        } catch (error) {
            logger.error('Error deleting evaluation:', error);
            throw error;
        }
    }

    formatResultsForUI(results) {
        try {
            // Extract key metrics and format for frontend consumption
            const summary = {
                totalTests: results.results?.length || 0,
                passedTests: 0,
                failedTests: 0,
                averageScore: 0,
                totalScore: 0
            };

            const detailedResults = [];

            if (results.results) {
                results.results.forEach((result, index) => {
                    const testResult = {
                        id: result.id || index,
                        prompt: result.prompt?.raw || result.prompt?.label || 'No prompt',
                        response: result.response?.output || 'No response',
                        score: 0,
                        passed: false,
                        assertions: [],
                        latencyMs: result.latencyMs || 0,
                        tokenUsage: result.response?.tokenUsage || {}
                    };

                    // Process grading results and assertions
                    if (result.gradingResult && result.gradingResult.componentResults) {
                        let totalScore = 0;
                        let maxScore = 0;
                        let passedAssertions = 0;

                        result.gradingResult.componentResults.forEach(component => {
                            const assertionResult = {
                                type: component.assertion?.type || 'unknown',
                                score: component.score || 0,
                                maxScore: 10, // LLM rubrics are typically scored 0-10
                                passed: component.pass || false,
                                reason: component.reason || '',
                                value: component.assertion?.value || ''
                            };

                            testResult.assertions.push(assertionResult);
                            totalScore += assertionResult.score;
                            maxScore += assertionResult.maxScore;
                            
                            if (assertionResult.passed) {
                                passedAssertions++;
                            }
                        });

                        // Calculate overall score for this test
                        testResult.score = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
                        testResult.passed = result.gradingResult.pass || false;
                        testResult.overallGradingScore = result.gradingResult.score || 0;

                        if (testResult.passed) {
                            summary.passedTests++;
                        } else {
                            summary.failedTests++;
                        }

                        summary.totalScore += testResult.score;
                    } else {
                        // Fallback for tests without grading results
                        testResult.passed = !result.error;
                        if (testResult.passed) {
                            summary.passedTests++;
                        } else {
                            summary.failedTests++;
                        }
                    }

                    // Add error information if present
                    if (result.error) {
                        testResult.error = result.error;
                    }

                    detailedResults.push(testResult);
                });

                summary.averageScore = summary.totalTests > 0 ?
                    summary.totalScore / summary.totalTests : 0;
            }

            return {
                summary,
                results: detailedResults,
                metadata: {
                    prompts: results.prompts || [],
                    providers: results.config?.providers || [],
                    timestamp: results.timestamp || new Date().toISOString(),
                    version: results.version || 'unknown'
                }
            };
        } catch (error) {
            logger.error('Error formatting results for UI:', error);
            throw error;
        }
    }
}

module.exports = PromptfooEvaluationService;
