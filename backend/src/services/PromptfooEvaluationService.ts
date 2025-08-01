import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import yaml from "yaml";
import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";
import ErrorClusteringService from "./ErrorClusteringService.js";
import {
  EvaluationRequest,
  EvaluationResult,
  TestCase,
  AssertionConfig,
  PromptConfig,
  PromptfooConfig,
  EvaluationResults,
  EvaluationSummary,
  EvaluationMetadata,
  EvaluationListItem,
  ComponentResult,
} from "../types/evaluation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PromptfooEvaluationService {
  private evaluationsDir: string;
  private resultsDir: string;
  private errorClusteringService: ErrorClusteringService;

  constructor() {
    this.evaluationsDir = path.join(__dirname, "../../evaluations");
    this.resultsDir = path.join(__dirname, "../../evaluation-results");
    this.errorClusteringService = new ErrorClusteringService();
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.ensureDir(this.evaluationsDir);
      await fs.ensureDir(this.resultsDir);
      // Ensure temp directory for CSV files
      await fs.ensureDir(path.join(__dirname, "../../temp"));
    } catch (error) {
      logger.error("Error creating evaluation directories:", error);
    }
  }

  /**
   * Save uploaded CSV file to temporary location for promptfoo
   */
  async saveTempCsvFile(
    csvContent: Buffer,
    evaluationId: string,
  ): Promise<string> {
    try {
      const tempDir = path.join(__dirname, "../../temp");
      await fs.ensureDir(tempDir); // Ensure temp directory exists

      const tempCsvPath = path.join(tempDir, `testdata-${evaluationId}.csv`);

      await fs.writeFile(tempCsvPath, csvContent);
      logger.info(`Temporary CSV file saved: ${tempCsvPath}`);

      return tempCsvPath;
    } catch (error) {
      logger.error("Error saving temporary CSV file:", error);
      throw error;
    }
  }

  /**
   * Cleanup temporary files after evaluation
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        logger.info(`Temporary file cleaned up: ${filePath}`);
      }
    } catch (error) {
      logger.warn(`Failed to cleanup temporary file ${filePath}:`, error);
      // Don't throw error for cleanup failure
    }
  }

  /**
   * Validate CSV format and structure
   */
  async validateCsvFile(csvPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(csvPath, "utf-8");
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      // Check if file has at least header and one data row
      if (lines.length < 2) {
        throw new Error(
          "CSV file must have at least a header row and one data row",
        );
      }

      // Basic validation - ensure consistent column count
      const headerCols = lines[0]?.split(",").length || 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]?.split(",").length || 0;
        if (cols !== headerCols) {
          logger.warn(
            `Row ${i + 1} has ${cols} columns, expected ${headerCols}`,
          );
        }
      }

      logger.info(
        `CSV validation passed: ${lines.length - 1} test cases found`,
      );
      return true;
    } catch (error) {
      logger.error("CSV validation failed:", error);
      throw error;
    }
  }

  /**
   * Get temporary directory path for this service
   */
  private getTempDir(): string {
    return path.join(__dirname, "../../temp");
  }

  /**
   * Clean up all temporary files older than specified hours (default: 24h)
   */
  async cleanupOldTempFiles(hoursOld: number = 24): Promise<void> {
    try {
      const tempDir = this.getTempDir();
      if (!(await fs.pathExists(tempDir))) {
        return;
      }

      const files = await fs.readdir(tempDir);
      const cutoffTime = Date.now() - hoursOld * 60 * 60 * 1000;

      for (const file of files) {
        if (file.startsWith("testdata-") && file.endsWith(".csv")) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime.getTime() < cutoffTime) {
            await fs.remove(filePath);
            logger.info(`Cleaned up old temp file: ${filePath}`);
          }
        }
      }
    } catch (error) {
      logger.warn("Error cleaning up old temp files:", error);
    }
  }

  async evaluatePrompts(request: EvaluationRequest): Promise<any> {
    let tempCsvPath: string | null = null;

    try {
      const evaluationId = uuidv4();
      logger.info(`Starting evaluation with ID: ${evaluationId}`);

      // Handle CSV file if provided
      if (request.testDataFile) {
        let fileBuffer = request.testDataFile.buffer;
        if (!fileBuffer) {
          throw new Error("Uploaded file is missing buffer data");
        }
        // Nếu là ArrayBuffer thì convert sang Buffer
        if (!(fileBuffer instanceof Buffer)) {
          fileBuffer = Buffer.from(fileBuffer);
        }
        tempCsvPath = await this.saveTempCsvFile(
          fileBuffer as unknown as Buffer,
          evaluationId,
        );
        logger.info(`Temporary CSV file saved to: ${tempCsvPath}`);

        // Validate CSV format
        await this.validateCsvFile(tempCsvPath);
      }

      // Generate promptfoo config with CSV path
      const config = this.generatePromptfooConfig(request, tempCsvPath);
      const configPath = path.join(
        this.evaluationsDir,
        `eval-${evaluationId}.yaml`,
      );

      // Write config file
      await fs.writeFile(configPath, config as string);
      logger.info(`Config written to: ${configPath}`);

      // Run promptfoo evaluation
      const results = await this.runEvaluation(configPath, evaluationId);

      console.log("Evaluation completed successfully:", results);

      return {
        evaluationId,
        configPath,
        results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Error in evaluatePrompts:", error);
      throw error;
    } finally {
      // Always cleanup temporary CSV file
      if (tempCsvPath) {
        await this.cleanupTempFile(tempCsvPath);
      }
    }
  }

  generatePromptfooConfig(
    request: EvaluationRequest,
    tempCsvPath?: string | null,
  ) {
    // Format providers to match the example structure
    const providers = request.providers?.map((provider) => ({
      id: provider.id || "google:gemini-2.5-flash",
      config: {
        apiKey: provider.config?.apiKey || process.env["GEMINI_API_KEY"] || "",
      },
    })) || [
      {
        id: "google:gemini-2.5-flash",
        config: {
          apiKey: process.env["GEMINI_API_KEY"] || "",
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      },
    ];

    // Handle prompts - support both string arrays and template strings with variables
    const prompts = request.prompts.map((p) => {
      if (typeof p === "string") {
        return p;
      }
      return p.content || p;
    });

    // Create defaultTest configuration for LLM-based evaluation
    let defaultTest: any = {};

    console.log("Request evaluation criteria:", request.evaluationCriteria);

    // Add LLM evaluation criteria to defaultTest
    const enabledCriteria = request.evaluationCriteria || [];
    if (enabledCriteria.length > 0) {
      console.log("Enabled criteria:", enabledCriteria);
      const defaultAssertions = enabledCriteria.map((criteria) => {
        // Handle both string criteria names and object criteria
        return {
          type: "llm-rubric",
          value: this.getCriteriaPrompt(criteria),
        };
      });

      console.log("Default assertions:", defaultAssertions);

      defaultTest.assert = defaultAssertions;
      defaultTest.options = {
        provider: providers[0]?.id, // Use the first provider for default test
      };
    }

    // Handle tests - support both inline test cases and CSV file references
    let tests: any = []; // Change to any to support both array and string format
    console.log("request.testDataFile", request.testDataFile);
    console.log("tempCsvPath", tempCsvPath);

    // Priority 1: If there's a CSV file reference, add it (and skip inline tests)
    if (tempCsvPath) {
      // Use simple format: tests: file:filename.csv
      tests = tempCsvPath;
      logger.info(`Using CSV file for tests: ${tempCsvPath}`);
    }
    // Priority 2: Add inline test cases only if no CSV file
    else if (request.testCases && request.testCases.length > 0) {
      tests = []; // Reset to array for inline tests
      const inlineTests = request.testCases.map((testCase) => {
        const testConfig: any = {};

        // Add input variables - ensure query is properly formatted
        if (testCase.input) {
          if (typeof testCase.input === "string") {
            // If input is a string, treat it as the query
            testConfig.vars = {
              query: testCase.input,
              expectedAnswer:
                testCase.expected || "A relevant and accurate response",
            };
          } else {
            // If input is an object, use it directly but ensure expectedAnswer is set
            testConfig.vars = {
              ...testCase.vars,
              expectedAnswer:
                testCase.expected || "A relevant and accurate response",
            };
          }
        }

        return testConfig;
      });

      tests.push(...inlineTests);
      logger.info(`Using ${inlineTests.length} inline test cases`);
    }
    console.log("tests", tests);

    // If no test cases provided but we have prompts, create a simple test case
    if (tests.length === 0 && prompts.length > 0) {
      tests.push({
        description: "",
        vars: {
          query: "What is the capital of France",
          expectedAnswer: "Paris is the capital of France",
        },
      });
    }

    // Build the final config object
    const config: PromptfooConfig = {
      description:
        request.description || "MAPE System Prompt Evaluation with LLM Grading",
      providers: providers,
      prompts: prompts,
      tests: tests,
    };

    // Add defaultTest only if it has content
    if (Object.keys(defaultTest).length > 0) {
      config.defaultTest = defaultTest;
    }

    return yaml.stringify(config);
  }

  // Helper method to get criteria-specific prompts
  getCriteriaPrompt(criteriaName: any): string {
    const criteriaPrompts = {
      accuracy: `Evaluate the accuracy of the AI response. Consider:
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

    return (
      (criteriaPrompts as any)[criteriaName.toLowerCase()] ||
      `Evaluate the AI response for ${criteriaName}. Rate from 0-10 based on quality. Expected: {{expectedAnswer}}`
    );
  }

  async extractEvaluationResultsFromFile(filePath: any): Promise<any> {
    try {
      // Read the JSON file
      const evaluationData = await fs.readJson(filePath);
      return await this.extractEvaluationResults(evaluationData);
    } catch (error) {
      throw new Error(
        `Failed to read evaluation results file: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  async extractEvaluationResults(evaluationData: any): Promise<any> {
    const { results, config } = evaluationData;

    console.log("%%%%%%%%%%%%%%%%%%%%%%", evaluationData);

    // Check if results structure is valid
    if (!results || !results.stats || !results.results) {
      throw new Error(
        "Invalid evaluation data structure: missing results, stats, or results array",
      );
    }

    // Extract summary information
    const totalTests =
      results.stats.successes + results.stats.failures + results.stats.errors;
    const passedTests = results.stats.successes;
    const failedTests = results.stats.failures;

    // Extract results array with relevant information
    const extractedResults = results.results.map(
      (result: any, index: number) => {
        // Extract component results for grading details
        let gradingResult = {
          pass: result.gradingResult?.pass || false,
          score: 0,
          reason: null,
        };

        // Get score and reason from componentResults if available
        if (
          result.gradingResult?.componentResults &&
          result.gradingResult.componentResults.length > 0
        ) {
          const component = result.gradingResult.componentResults[0]; // Take first component
          gradingResult.score = component.score || 0;
          gradingResult.reason = component.reason || null;
          gradingResult.pass = component.pass || false;
        }

        return {
          id: result.id,
          promptId: result.promptId,
          testIdx: result.testIdx,
          success: result.success,
          score: gradingResult.score, // Use component score directly
          reason: gradingResult.reason,
          prompt: config.prompts[result.promptIdx] || null,
          response: result.response?.output || null,
          vars: result.vars,
          latencyMs: result.latencyMs,
          cost: result.cost,
          tokenUsage: result.response?.tokenUsage || null,
          passed: gradingResult.pass,
        };
      },
    );

    // Calculate average score from component results
    const totalScore = extractedResults.reduce(
      (sum: any, result: any) => sum + (result.score || 0),
      0,
    );
    const averageScore = totalTests > 0 ? totalScore / totalTests : 0;

    // Extract metadata
    const metadata = {
      prompts: results.prompts,
      providers: config.providers,
      timestamp: results.timestamp,
      version: results.version,
      evalId: evaluationData.evalId,
      description: config.description,
      tokenUsage: results.stats.tokenUsage,
    };

    // Prepare base results object
    const baseResults = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        averageScore: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
        totalScore,
      },
      results: extractedResults,
      metadata,
    };

    // Perform error clustering if there are failed tests
    if (failedTests > 0 && extractedResults && extractedResults.length > 0) {
      try {
        logger.info("Starting error clustering analysis...", {
          failedTests,
          extractedResultsLength: extractedResults.length,
          extractedResultsType: typeof extractedResults,
        });
        const failResults = extractedResults.filter(
          (result: any) => !result.success,
        );

        console.log(
          "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          failResults,
        );

        logger.info(
          `Filtered ${failResults.length} failed results for clustering`,
        );
        const clusteringResults =
          await this.errorClusteringService.clusterFailedTests(failResults);
        (baseResults as any).errorClusters = clusteringResults;
        logger.info(
          `Error clustering completed. Found ${clusteringResults.promptClusters?.length || 0} prompt clusters.`,
        );
      } catch (error) {
        logger.error("Error clustering failed:", error, {
          extractedResults: extractedResults
            ? extractedResults.length
            : "undefined",
          failedTests,
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Don't fail the entire evaluation if clustering fails
        (baseResults as any).errorClusters = {
          promptClusters: [],
          summary: {
            totalFailed: failedTests,
            totalPrompts: 0,
            analysisTime: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
          },
          insights: "Error clustering analysis failed",
        };
      }
    } else {
      (baseResults as any).errorClusters = {
        promptClusters: [],
        summary: {
          totalFailed: 0,
          totalPrompts: 0,
          analysisTime: new Date().toISOString(),
        },
        insights: "No failed tests to analyze",
      };
    }

    return baseResults;
  }

  async runEvaluation(configPath: any, evaluationId: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(
        this.resultsDir,
        `results-${evaluationId}.json`,
      );
      const args = ["promptfoo", "eval", "-c", configPath, "-o", outputPath];

      logger.info(`Running evaluation command: npx ${args.join(" ")}`);

      // Ensure promptfoo has access to the Google API key
      const evalEnv = {
        ...process.env,
        GOOGLE_API_KEY:
          process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"] || "",
      };

      const child = spawn("npx", args, {
        cwd: process.cwd(),
        env: evalEnv,
        shell: true, // Use shell: true to handle 'npx' correctly on all platforms
      });

      let stdout = "";
      let stderr = "";

      // Listen to stdout stream in real-time
      child.stdout.on("data", (data) => {
        const output = data.toString();
        stdout += output;
        logger.info(`[promptfoo stdout]: ${output}`); // Log output as it comes
      });

      // Listen to stderr stream in real-time
      child.stderr.on("data", (data) => {
        const errorOutput = data.toString();
        stderr += errorOutput;
        logger.error(`[promptfoo stderr]: ${errorOutput}`); // Log errors as they come
      });

      // Handle process errors (e.g., command not found)
      child.on("error", (error) => {
        logger.error("Failed to start subprocess.", error);
        reject(new Error(`Failed to start subprocess: ${error.message}`));
      });

      // The 'close' event fires when the process has terminated
      child.on("close", async (code) => {
        try {
          logger.info(`Child process exited with code ${code}`);

          // Với promptfoo, exit code 100 thường có nghĩa là có test failures, không phải system error
          // Chỉ reject khi có system error thực sự (code khác 0 và khác 100)
          if (code !== 0 && code !== 100) {
            reject(
              new Error(
                `Evaluation failed with exit code ${code}. Stderr: ${stderr}`,
              ),
            );
            return;
          }

          // Nếu code = 100, vẫn coi là thành công nhưng có test failures
          if (code === 100) {
            logger.warn("Evaluation completed with test failures");
          }

          const extractedData =
            await this.extractEvaluationResultsFromFile(outputPath);
          console.log(JSON.stringify(extractedData, null, 2));

          // QUAN TRỌNG: Phải resolve() thay vì return
          resolve(extractedData);
        } catch (error) {
          logger.error("Error processing evaluation results:", error);
          reject(error);
        }
      });
    });
  }
  async getEvaluationResults(evaluationId: any): Promise<EvaluationResults> {
    try {
      const resultsPath = path.join(
        this.resultsDir,
        `results-${evaluationId}.json`,
      );
      const resultsExist = await fs.pathExists(resultsPath);

      if (!resultsExist) {
        throw new Error(`Evaluation results not found for ID: ${evaluationId}`);
      }

      const results = await fs.readJson(resultsPath);
      return results;
    } catch (error) {
      logger.error("Error getting evaluation results:", error);
      throw error;
    }
  }

  async listEvaluations() {
    try {
      const files = await fs.readdir(this.resultsDir);
      const evaluations = [];

      for (const file of files) {
        if (file.startsWith("results-") && file.endsWith(".json")) {
          const filePath = path.join(this.resultsDir, file);
          const stats = await fs.stat(filePath);
          const evaluationId = file
            .replace("results-", "")
            .replace(".json", "");

          evaluations.push({
            id: evaluationId,
            filename: file,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            size: stats.size,
          });
        }
      }

      // Sort by creation date (newest first)
      evaluations.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      return evaluations;
    } catch (error) {
      logger.error("Error listing evaluations:", error);
      throw error;
    }
  }

  async deleteEvaluation(evaluationId: any): Promise<void> {
    try {
      const resultsPath = path.join(
        this.resultsDir,
        `results-${evaluationId}.json`,
      );
      const configPath = path.join(
        this.evaluationsDir,
        `eval-${evaluationId}.yaml`,
      );

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
    } catch (error) {
      logger.error("Error deleting evaluation:", error);
      throw error;
    }
  }

  formatResultsForUI(results: any): any {
    try {
      // Extract key metrics and format for frontend consumption
      const summary = {
        totalTests: results.results?.length || 0,
        passedTests: 0,
        failedTests: 0,
        averageScore: 0,
        totalScore: 0,
      };

      const detailedResults: any[] = [];

      if (results.results) {
        results.results.forEach((result: any, index: number) => {
          const testResult = {
            id: result.id || index,
            prompt: result.prompt || result.prompt || "No prompt",
            response: result.response || "No response",
            score: 0,
            passed: false,
            assertions: [],
            latencyMs: result.latencyMs || 0,
            tokenUsage: result.response?.tokenUsage || {},
          };

          // Process grading results and assertions
          if (result.gradingResult && result.gradingResult.componentResults) {
            let totalScore = 0;
            let maxScore = 0;
            let passedAssertions = 0;

            result.gradingResult.componentResults.forEach((component: any) => {
              const assertionResult = {
                type: component.assertion?.type || "unknown",
                score: component.score || 0,
                maxScore: 10, // LLM rubrics are typically scored 0-10
                passed: component.pass || false,
                reason: component.reason || "",
                value: component.assertion?.value || "",
              };

              (testResult.assertions as any[]).push(assertionResult);
              totalScore += assertionResult.score;
              maxScore += assertionResult.maxScore;

              if (assertionResult.passed) {
                passedAssertions++;
              }
            });

            // Calculate overall score for this test
            testResult.score = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
            testResult.passed = result.gradingResult.pass || false;
            (testResult as any).overallGradingScore =
              result.gradingResult.score || 0;

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
            (testResult as any).error = result.error;
          }

          detailedResults.push(testResult);
        });

        summary.averageScore =
          summary.totalTests > 0 ? summary.totalScore / summary.totalTests : 0;
      }

      return {
        summary,
        results: detailedResults as any[],
        metadata: {
          prompts: results.prompts || [],
          providers: results.config?.providers || [],
          timestamp: results.timestamp || new Date().toISOString(),
          version: results.version || "unknown",
        },
      };
    } catch (error) {
      logger.error("Error formatting results for UI:", error);
      throw error;
    }
  }
}

export default PromptfooEvaluationService;
