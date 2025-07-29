const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const yaml = require('yaml');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const ErrorClusteringService = require('./ErrorClusteringService');

class PromptfooEvaluationService {
    constructor() {
        this.evaluationsDir = path.join(__dirname, '../../evaluations');
        this.resultsDir = path.join(__dirname, '../../evaluation-results');
        this.errorClusteringService = new ErrorClusteringService();
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

        console.log('Request evaluation criteria:', request.evaluationCriteria);

        // Add LLM evaluation criteria to defaultTest
        const enabledCriteria = request.evaluationCriteria || [];
        if (enabledCriteria.length > 0) {
            console.log('Enabled criteria:', enabledCriteria);
            const defaultAssertions = enabledCriteria.map(criteria => {
                // Handle both string criteria names and object criteria
                return {
                    type: 'llm-rubric',
                    value: this.getCriteriaPrompt(criteria)
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
                            expectedAnswer: testCase.expected || "A relevant and accurate response"
                        };
                    } else {
                        // If input is an object, use it directly but ensure expectedAnswer is set
                        testConfig.vars = {
                            ...testCase.input,
                            expectedAnswer: testCase.expected || "A relevant and accurate response"
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
        };

        return criteriaPrompts[criteriaName.toLowerCase()] || `Evaluate the AI response for ${criteriaName}. Rate from 0-10 based on quality. Expected: {{expectedAnswer}}`;
    }


    async extractEvaluationResultsFromFile(filePath) {
        try {
            // Read the JSON file
            const evaluationData = await fs.readJson(filePath);
            return await this.extractEvaluationResults(evaluationData);
        } catch (error) {
            throw new Error(`Failed to read evaluation results file: ${error.message}`);
        }
    }

    async extractEvaluationResults(evaluationData) {
        const { results, config, prompts } = evaluationData;


        // Extract summary information
        const totalTests = results.stats.successes + results.stats.failures + results.stats.errors;
        const passedTests = results.stats.successes;
        const failedTests = results.stats.failures;

        // Extract results array with relevant information
        const extractedResults = results.results.map((result, index) => {
            // Extract component results for grading details
            let gradingResult = {
                pass: result.gradingResult?.pass || false,
                score: 0,
                reason: null
            };

            // Get score and reason from componentResults if available
            if (result.gradingResult?.componentResults && result.gradingResult.componentResults.length > 0) {
                const component = result.gradingResult.componentResults[0]; // Take first component
                gradingResult.score = component.score || 0;
                gradingResult.reason = component.reason || null;
                gradingResult.pass = component.pass || false;
            }

            return {
                id: result.id,
                testIdx: result.testIdx,
                success: result.success,
                score: gradingResult.score, // Use component score directly
                reason: gradingResult.reason,
                prompt: results.prompts[index]?.raw || null,
                response: result.response?.output || null,
                vars: result.vars,
                latencyMs: result.latencyMs,
                cost: result.cost,
                tokenUsage: result.response?.tokenUsage || null,
                passed: gradingResult.pass
            };
        });

        // Calculate average score from component results
        const totalScore = extractedResults.reduce((sum, result) => sum + (result.score || 0), 0);
        const averageScore = totalTests > 0 ? totalScore / totalTests : 0;

        // Extract metadata
        const metadata = {
            prompts: results.prompts,
            providers: config.providers,
            timestamp: results.timestamp,
            version: results.version,
            evalId: evaluationData.evalId,
            description: config.description,
            tokenUsage: results.stats.tokenUsage
        };

        // Prepare base results object
        const baseResults = {
            summary: {
                totalTests,
                passedTests,
                failedTests,
                averageScore: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
                totalScore
            },
            results: extractedResults,
            metadata
        };

        // Perform error clustering if there are failed tests
        if (failedTests > 0) {
            try {
                logger.info('Starting error clustering analysis...');
                const clusteringResults = await this.errorClusteringService.clusterFailedTests(baseResults);
                baseResults.errorClusters = clusteringResults;
                logger.info(`Error clustering completed. Found ${clusteringResults.clusters.length} clusters.`);
            } catch (error) {
                logger.error('Error clustering failed:', error);
                // Don't fail the entire evaluation if clustering fails
                baseResults.errorClusters = {
                    clusters: [],
                    summary: {
                        totalFailed: failedTests,
                        clustersFound: 0,
                        analysisTime: new Date().toISOString(),
                        error: error.message
                    },
                    insights: "Error clustering analysis failed"
                };
            }
        } else {
            baseResults.errorClusters = {
                clusters: [],
                summary: {
                    totalFailed: 0,
                    clustersFound: 0,
                    analysisTime: new Date().toISOString()
                },
                insights: "No failed tests to analyze"
            };
        }

        return baseResults;
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
        child.on('close', async (code) => {
            try {
                logger.info(`Child process exited with code ${code}`);

                // Với promptfoo, exit code 100 thường có nghĩa là có test failures, không phải system error
                // Chỉ reject khi có system error thực sự (code khác 0 và khác 100)
                if (code !== 0 && code !== 100) {
                    reject(new Error(`Evaluation failed with exit code ${code}. Stderr: ${stderr}`));
                    return;
                }

                // Nếu code = 100, vẫn coi là thành công nhưng có test failures
                if (code === 100) {
                    logger.warn('Evaluation completed with test failures');
                }

                const extractedData = await this.extractEvaluationResultsFromFile(outputPath);
                console.log(JSON.stringify(extractedData, null, 2));
                
                // QUAN TRỌNG: Phải resolve() thay vì return
                resolve(extractedData);
                
            } catch (error) {
                logger.error('Error processing evaluation results:', error);
                reject(error);
            }
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
                        prompt: result.prompt || result.prompt || 'No prompt',
                        response: result.response || 'No response',
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
