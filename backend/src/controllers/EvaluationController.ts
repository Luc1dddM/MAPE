import { Request, Response } from "express";
import PromptfooEvaluationService from "../services/PromptfooEvaluationService.js";
import ErrorClusteringService from "../services/ErrorClusteringService.js";
import logger from "../utils/logger.js";
import fs from "fs-extra";
import path from "path";
import {
  EvaluationResults,
  EvaluationRequest,
  ProviderInfo,
  CriteriaInfo,
  ComponentResult,
} from "../types/evaluation.js";

class EvaluationController {
  private evaluationService: PromptfooEvaluationService;
  private clusteringService: ErrorClusteringService;

  constructor() {
    this.evaluationService = new PromptfooEvaluationService();
    this.clusteringService = new ErrorClusteringService();
  }

  // Create and run a new evaluation
  async createEvaluation(req: Request, res: Response): Promise<void> {
    try {
      const evaluationRequest = req.body;
      console.log(
        "Received evaluation request:",
        JSON.stringify(evaluationRequest, null, 2),
      );

      // Debug: Log the full request body
      logger.info(
        "Full request body received:",
        JSON.stringify(req.body, null, 2),
      );

      logger.info("Creating new evaluation:", {
        promptCount: evaluationRequest.prompts?.length || 0,
        testCaseCount: evaluationRequest.testCases?.length || 0,
        hasTestFile: !!evaluationRequest.testDataFile,
        hasProviders: !!evaluationRequest.providers,
        hasCriteria: !!evaluationRequest.evaluationCriteria,
      });

      const result =
        await this.evaluationService.evaluatePrompts(evaluationRequest);

      console.log("Evaluation result:", JSON.stringify(result, null, 2));

      // Format results for UI (không cần format lại vì đã có error clusters)
      // const formattedResults = this.evaluationService.formatResultsForUI(result.results);

      res.status(200).json({
        success: true,
        data: {
          evaluationId: result.evaluationId,
          configPath: result.configPath,
          timestamp: result.timestamp,
          summary: result.results?.summary,
          results: result.results?.results,
          metadata: result.results?.metadata,
          errorClusters: result.results?.errorClusters,
        },
      });
    } catch (error) {
      logger.error("Error in createEvaluation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create evaluation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Get evaluation results by ID
  async getEvaluation(req: Request, res: Response): Promise<void> {
    try {
      const { evaluationId } = req.params;

      logger.info(`Getting evaluation results for ID: ${evaluationId}`);

      const results =
        await this.evaluationService.getEvaluationResults(evaluationId);
      // const formattedResults = this.evaluationService.formatResultsForUI(results);

      res.status(200).json({
        success: true,
        data: {
          evaluationId,
          summary: results.summary,
          results: results.results,
          metadata: results.metadata,
          errorClusters: results.errorClusters,
        },
      });
    } catch (error) {
      logger.error("Error in getEvaluation:", error);

      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          error: "Evaluation not found",
          message: error.message,
        });
        return;
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to retrieve evaluation",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return;
      }
    }
  }

  // List all evaluations
  async listEvaluations(req: Request, res: Response): Promise<void> {
    try {
      logger.info("Listing all evaluations");

      const evaluations = await this.evaluationService.listEvaluations();

      res.status(200).json({
        success: true,
        data: {
          evaluations,
          count: evaluations.length,
        },
      });
    } catch (error) {
      logger.error("Error in listEvaluations:", error);
      res.status(500).json({
        success: false,
        error: "Failed to list evaluations",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Delete an evaluation
  async deleteEvaluation(req: Request, res: Response): Promise<void> {
    try {
      const { evaluationId } = req.params;

      logger.info(`Deleting evaluation: ${evaluationId}`);

      await this.evaluationService.deleteEvaluation(evaluationId);

      res.status(200).json({
        success: true,
        message: "Evaluation deleted successfully",
      });
    } catch (error) {
      logger.error("Error in deleteEvaluation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete evaluation",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Get evaluation status (for long-running evaluations)
  async getEvaluationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { evaluationId } = req.params;

      // Check if evaluation results exist
      try {
        await this.evaluationService.getEvaluationResults(evaluationId);
        res.status(200).json({
          success: true,
          data: {
            evaluationId,
            status: "completed",
          },
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          res.status(200).json({
            success: true,
            data: {
              evaluationId,
              status: "running",
            },
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error("Error in getEvaluationStatus:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get evaluation status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Get available evaluation criteria
  async getEvaluationCriteria(req: Request, res: Response): Promise<void> {
    try {
      const criteria: CriteriaInfo[] = [
        {
          name: "accuracy",
          description:
            "Evaluates factual correctness and proper handling of input",
          enabled: true,
        },
        {
          name: "relevance",
          description:
            "Assesses how well the response addresses the user query",
          enabled: true,
        },
        {
          name: "completeness",
          description:
            "Checks if all parts of the query are adequately addressed",
          enabled: true,
        },
        {
          name: "format",
          description:
            "Verifies adherence to expected output format and structure",
          enabled: false,
        },
        {
          name: "clarity",
          description: "Evaluates clarity and readability of the response",
          enabled: false,
        },
        {
          name: "safety",
          description: "Ensures response is safe and appropriate",
          enabled: false,
        },
      ];

      res.status(200).json({
        success: true,
        data: {
          criteria,
          count: criteria.length,
        },
      });
    } catch (error) {
      logger.error("Error in getEvaluationCriteria:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get evaluation criteria",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Download evaluation results file
  async downloadEvaluation(req: Request, res: Response): Promise<void> {
    try {
      const { evaluationId } = req.params;
      const { format = "json" } = req.query;

      logger.info(`Downloading evaluation ${evaluationId} in ${format} format`);

      // Get the evaluation results
      const results =
        await this.evaluationService.getEvaluationResults(evaluationId);

      if (!results) {
        res.status(404).json({
          success: false,
          error: "Evaluation not found",
        });
        return;
      }

      // Set appropriate headers for file download
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      let filename, contentType, content;

      if (format === "json") {
        filename = `evaluation-${evaluationId}-${timestamp}.json`;
        contentType = "application/json";
        content = JSON.stringify(results, null, 2);
      } else if (format === "csv") {
        filename = `evaluation-${evaluationId}-${timestamp}.csv`;
        contentType = "text/csv";
        content = this.convertResultsToCSV(results);
      } else {
        res.status(400).json({
          success: false,
          error: "Unsupported format. Use json or csv.",
        });
        return;
      }

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Type", contentType);
      res.send(content);
    } catch (error) {
      logger.error("Error in downloadEvaluation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to download evaluation",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Helper method to convert results to CSV format
  convertResultsToCSV(results: EvaluationResults) {
    if (!results.results || results.results.length === 0) {
      return "No results available";
    }

    const headers = [
      "Test ID",
      "Prompt",
      "Response",
      "Score",
      "Passed",
      "Latency (ms)",
      "Token Usage",
      "Assertions Summary",
    ];

    const rows = results.results.map((result) => {
      const assertionsSummary =
        result.gradingResult?.componentResults
          ?.map(
            (comp: ComponentResult) =>
              `${comp.assertion?.type}: ${comp.score}/10`,
          )
          .join("; ") || "No assertions";

      return [
        result.id || "",
        `"${(result.prompt?.raw || result.prompt?.label || "").replace(/"/g, '""')}"`,
        `"${(result.response?.output || "").replace(/"/g, '""')}"`,
        result.gradingResult?.score || 0,
        result.gradingResult?.pass || false,
        result.latencyMs || 0,
        result.response?.tokenUsage?.total || 0,
        `"${assertionsSummary}"`,
      ];
    });

    const csvContent = [headers.join(",")]
      .concat(rows.map((row: any[]) => row.join(",")))
      .join("\n");

    return csvContent;
  }

  // Get available providers
  async getProviders(req: Request, res: Response): Promise<void> {
    try {
      const providers: ProviderInfo[] = [
        {
          id: "google:gemini-2.0-flash-lite",
          name: "Google Gemini 2.0 Flash Lite",
          description: "Latest experimental model with enhanced capabilities",
          supportedParams: ["temperature", "maxOutputTokens", "topP", "topK"],
        },
      ];

      res.status(200).json({
        success: true,
        data: {
          providers,
          count: providers.length,
        },
      });
    } catch (error) {
      logger.error("Error in getProviders:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get providers",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export default EvaluationController;
