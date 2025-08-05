import React, { useState } from "react";
import { Card, Button } from "@/components/ui";
import { evaluationService } from "@/services/api";
import ErrorClusteringView from "./ErrorClusteringView";
import {
  EvaluationResult,
  EvaluationSummary,
  EvaluationMetadata,
  ErrorClusteringResults,
} from "@/types/api";
import toast from "react-hot-toast";
import {
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  TargetIcon,
  XIcon,
} from "lucide-react";

interface EvaluationResultsProps {
  summary: EvaluationSummary;
  results: EvaluationResult[];
  metadata: EvaluationMetadata;
  evaluationId: string;
  errorClusters?: ErrorClusteringResults;
  onOptimizeStart?: (data: {
    originalPrompt: string;
    selectedTestCases: any[];
    promptIndex: number;
    optimizationResult?: any;
  }) => void;
}

// Helper function to get score color
const getScoreColor = (score: number): string => {
  if (score >= 7) return "text-green-600";
  if (score >= 5) return "text-yellow-600";
  return "text-red-600";
};

// Helper function to truncate text
const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export const EvaluationResults: React.FC<EvaluationResultsProps> = ({
  summary,
  results,
  metadata,
  evaluationId,
  errorClusters,
  onOptimizeStart,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "results" | "analysis"
  >("overview");

  const handleDownload = async () => {
    try {
      await evaluationService.downloadEvaluation(evaluationId);
      toast.success("Results downloaded successfully!");
    } catch (error: any) {
      toast.error(`Failed to download results: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ChartBarIcon />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === "results"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <TargetIcon />
            <span>Results</span>
          </button>
          {summary.failedTests > 0 && errorClusters && (
            <button
              onClick={() => setActiveTab("analysis")}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === "analysis"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>Error Analysis</span>
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <Card>
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Evaluation Summary
            </h3>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <DownloadIcon />
              <span className="ml-2">Download</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <ChartBarIcon />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {summary.totalTests}
              </div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <CheckIcon />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {summary.passedTests}
              </div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <XIcon />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {summary.failedTests}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <TargetIcon />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {summary.averageScore.toFixed(1)}/10
              </div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Evaluation Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">ID:</span>
                <div className="text-gray-600 font-mono text-xs mt-1">
                  {evaluationId}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Timestamp:</span>
                <div className="text-gray-600 mt-1">
                  {new Date(metadata.timestamp).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Version:</span>
                <div className="text-gray-600 mt-1">{metadata.version}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "results" && (
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Test Results
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Query
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prompt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Response
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Latency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pass/Fail
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result, index) => {
                  // Handle both array format (current) and object format (new spec)
                  const query = Array.isArray(result.vars)
                    ? result.vars?.[0]?.query
                    : (result.vars as any)?.query;
                  const expectedAnswer = Array.isArray(result.vars)
                    ? result.vars?.[0]?.expectedAnswer
                    : (result.vars as any)?.expectedAnswer;
                  const promptText =
                    typeof result.prompt === "string"
                      ? result.prompt
                      : result.prompt?.raw || "Unknown prompt";

                  return (
                    <tr key={result.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div
                          className="max-w-xs cursor-help"
                          title={query || "No query"}
                        >
                          {truncateText(query || "No query", 80)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div
                          className="max-w-xs cursor-help"
                          title={
                            typeof promptText === "string"
                              ? promptText
                              : promptText
                          }
                        >
                          {truncateText(
                            typeof promptText === "string"
                              ? promptText
                              : promptText,
                            80,
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div
                          className="max-w-xs cursor-help"
                          title={expectedAnswer || "No expected answer"}
                        >
                          {truncateText(
                            expectedAnswer || "No expected answer",
                            80,
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div
                          className="max-w-xs cursor-help"
                          title={result.response || "No response"}
                        >
                          {truncateText(result.response || "No response", 80)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`font-medium ${getScoreColor(result.score)}`}
                        >
                          {result.score}/10
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <ClockIcon />
                          <span>{result.latencyMs}ms</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center">
                          {result.passed ? <CheckIcon /> : <XIcon />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "analysis" && errorClusters && (
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Error Pattern Analysis
          </h3>
          <ErrorClusteringView
            clusteringResults={errorClusters}
            evaluationId={evaluationId}
          />
        </Card>
      )}
    </div>
  );
};
