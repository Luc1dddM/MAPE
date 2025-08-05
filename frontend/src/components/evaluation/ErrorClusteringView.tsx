import React, { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CogIcon,
  InformationCircleIcon,
  ListBulletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { optimizeService, OptimizePromptRequest } from "@/services/optimize";
import { usePromptStore } from "@/stores/promptStore";
import {
  useOptimizationStore,
  createOptimizationFromResponse,
} from "@/stores/optimizationStore";
import toast from "react-hot-toast";

// New data structure interfaces
interface PromptCluster {
  prompt: string;
  totalFailedTests: number;
  clusters: Array<{
    id: number;
    size: number;
    tests: Array<{
      id: string;
      vars: { query: string; expectedAnswer: string };
      response: string;
      score: number;
      reason: string;
    }>;
    representativeError: string;
    category: { name: string; description: string };
  }>;
}

interface NewErrorClusters {
  promptClusters: PromptCluster[];
}

interface ErrorClusteringViewProps {
  clusteringResults: NewErrorClusters | any; // Support both old and new format
  evaluationId: string;
  onOptimizeStart?: (data: {
    originalPrompt: string;
    selectedTestCases: any[];
    promptIndex: number;
    optimizationResult?: any;
  }) => void;
}

import TestCasesDialog from "./dialogs/TestCasesDialog";

const ErrorClusteringView = ({
  clusteringResults,
  evaluationId,
  onOptimizeStart,
}: ErrorClusteringViewProps) => {
  const [expandedPrompts, setExpandedPrompts] = useState<Set<number>>(
    new Set(),
  );
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    new Set(),
  );
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Get prompt store state
  const { selectedTestCase } = usePromptStore();

  // Get optimization store
  const { addOptimization } = useOptimizationStore();

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTestCasesModal, setShowTestCasesModal] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<any>(null);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number>(0);

  // Handle both old and new data formats
  const promptClusters = clusteringResults.promptClusters || [];

  const handleTestCaseSelection = (test: any, clusterId: string) => {
    const failedTestCase = {
      testCaseId: test.id,
      assertion: "llm-rubric",
      pass: false,
      score: test.score,
      reason: test.reason || "Performance issue",
      tokensUsed: {
        total: 0,
        prompt: 0,
        completion: 0,
        cached: 0,
        completionDetails: {
          reasoning: 0,
          acceptedPrediction: 0,
          rejectedPrediction: 0,
        },
      },
      output: test.response,
      input: test.vars.query,
      expectedOutput: test.vars.expectedAnswer,
    };
  };

  const handleShowClusterDetail = (cluster: any, promptIndex: number) => {
    setSelectedCluster(cluster);
    setSelectedPromptIndex(promptIndex);
    setShowDetailModal(true);
  };

  const handleShowTestCases = (cluster: any, promptIndex: number) => {
    setSelectedCluster(cluster);
    setSelectedPromptIndex(promptIndex);
    setShowTestCasesModal(true);
  };

  const closeModals = () => {
    setShowDetailModal(false);
    setShowTestCasesModal(false);
    setSelectedCluster(null);
  };

  // Part 1: Data Preparation - Retrieve prompts with promptIndex and format payload
  const handleOptimizePrompt = async (promptIndex: number) => {
    // Filter selected test cases for this specific prompt
    const promptSelectedCases = selectedTestCase.filter(
      (testCase) => testCase.promptId === promptIndex.toString(),
    );

    if (promptSelectedCases.length === 0) {
      toast.error("No test cases selected for optimization");
      return;
    }

    // Get the prompt from clustering results
    const promptClusters = clusteringResults.promptClusters || [];
    const targetPromptCluster = promptClusters[promptIndex];

    if (!targetPromptCluster) {
      toast.error("Prompt not found in clustering results");
      return;
    }

    const originalPrompt = targetPromptCluster.prompt;

    // Group selected test cases by cluster and format for API
    const clusterMap = new Map();

    promptSelectedCases.forEach((selectedCase) => {
      const { clusterId, testId } = selectedCase;

      // Find the cluster and test in the clustering results
      const cluster = targetPromptCluster.clusters.find(
        (c: any) => c.id === clusterId,
      );

      if (cluster) {
        const test = cluster.tests.find((t: any) => t.id === testId);

        if (test) {
          if (!clusterMap.has(clusterId)) {
            clusterMap.set(clusterId, {
              reason: cluster.representativeError,
              failedTestCases: [],
              prompt: originalPrompt,
            });
          }

          // Format test case for API
          const formattedTestCase = {
            promptId: promptIndex.toString(),
            testCaseId: testId,
            assertion: {
              type: "llm-rubric",
              value: "Performance evaluation",
            },
            pass: false,
            score: test.score,
            reason: test.reason || cluster.representativeError,
            tokensUsed: {
              total: 0,
              prompt: 0,
              completion: 0,
              cached: 0,
              completionDetails: {
                reasoning: 0,
                acceptedPrediction: 0,
                rejectedPrediction: 0,
              },
            },
            output: test.response,
            input: test.vars.query,
            expectedOutput: test.vars.expectedAnswer,
            executionTime: 0,
          };

          clusterMap.get(clusterId).failedTestCases.push(formattedTestCase);
        }
      }
    });

    const failedClusters = Array.from(clusterMap.values());

    // Prepare the optimization request
    const optimizeRequest: OptimizePromptRequest = {
      originalPrompt,
      failedClusters,
      promptId: `${evaluationId}-prompt-${promptIndex}`,
    };

    // Part 2: API Call - Send formatted data to backend
    try {
      setIsOptimizing(true);
      toast.loading("Optimizing prompt...", { id: "optimize-prompt" });

      const response = await optimizeService.optimizePrompt(optimizeRequest);

      if (response.success) {
        toast.success("Prompt optimization completed!", {
          id: "optimize-prompt",
        });

        // Store optimization result in the optimization store
        const optimizationResult = createOptimizationFromResponse(
          response,
          evaluationId,
          promptIndex,
          originalPrompt,
          promptSelectedCases,
        );

        const optimizationId = addOptimization(optimizationResult);
        console.log("Stored optimization with ID:", optimizationId);

        // Call the onOptimizeStart callback if provided
        if (onOptimizeStart) {
          onOptimizeStart({
            originalPrompt,
            selectedTestCases: promptSelectedCases,
            promptIndex,
            optimizationResult: response,
          });
        }

        return response;
      } else {
        toast.error(response.error || "Optimization failed", {
          id: "optimize-prompt",
        });
        return null;
      }
    } catch (error) {
      console.error("Optimization error:", error);
      toast.error("Failed to optimize prompt", { id: "optimize-prompt" });
      return null;
    } finally {
      setIsOptimizing(false);
    }
  };

  const togglePrompt = (promptIndex: number) => {
    const newExpanded = new Set(expandedPrompts);
    if (newExpanded.has(promptIndex)) {
      newExpanded.delete(promptIndex);
    } else {
      newExpanded.add(promptIndex);
    }
    setExpandedPrompts(newExpanded);
  };

  const toggleCluster = (clusterId: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId);
    } else {
      newExpanded.add(clusterId);
    }
    setExpandedClusters(newExpanded);
  };

  const toggleTest = (testId: string) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }
    setExpandedTests(newExpanded);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 7) return "text-green-600";
    if (score >= 5) return "text-yellow-600";
    return "text-red-600";
  };

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const getClusterColor = (clusterId: number) => {
    const colors = [
      "bg-red-50 border-red-200",
      "bg-yellow-50 border-yellow-200",
      "bg-blue-50 border-blue-200",
      "bg-purple-50 border-purple-200",
      "bg-green-50 border-green-200",
    ];
    return colors[clusterId % colors.length];
  };

  if (!promptClusters || promptClusters.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-green-600 text-lg font-medium mb-2">
          🎉 No Error Patterns Found
        </div>
        <p className="text-green-700">
          Great job! All tests passed or errors are isolated incidents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2" />
            Error Pattern Analysis
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {promptClusters.reduce(
                (acc: number, pc: any) => acc + pc.clusters.length,
                0,
              )}
            </div>
            <div className="text-sm text-gray-600">Error Clusters</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {promptClusters.reduce(
                (acc: number, pc: any) => acc + pc.totalFailedTests,
                0,
              )}
            </div>
            <div className="text-sm text-gray-600">Failed Tests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {promptClusters.length}
            </div>
            <div className="text-sm text-gray-600">Unique Prompts</div>
          </div>
        </div>
      </div>

      {/* Prompt Clusters - Hierarchy: Prompt → Cluster → Test Cases */}
      <div className="space-y-6">
        {promptClusters.map((promptCluster: any, promptIndex: number) => {
          return (
            <div
              key={promptIndex}
              className="border border-gray-300 rounded-lg bg-white"
            >
              {/* Prompt Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <button
                      onClick={() => togglePrompt(promptIndex)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {expandedPrompts.has(promptIndex) ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-semibold text-gray-900">
                          Prompt #{promptIndex + 1}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {truncateText(promptCluster.prompt, 120)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Failed Tests Count */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">
                        {promptCluster.totalFailedTests}
                      </div>
                      <div className="text-xs text-gray-500">failed tests</div>
                    </div>

                    {/* Selected Tests Indicator */}
                    {(() => {
                      const selectedTestCasesCount = selectedTestCase.filter(
                        (testCase) =>
                          testCase.promptId === promptIndex.toString(),
                      ).length;

                      return (
                        selectedTestCasesCount > 0 && (
                          <div className="text-center">
                            <div className="text-sm font-medium text-blue-600">
                              {selectedTestCasesCount}
                            </div>
                            <div className="text-xs text-gray-500">
                              selected
                            </div>
                          </div>
                        )
                      );
                    })()}

                    {/* Optimize Button */}
                    {(() => {
                      const selectedTestCasesCount = selectedTestCase.filter(
                        (testCase) =>
                          testCase.promptId === promptIndex.toString(),
                      ).length;

                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOptimizePrompt(promptIndex);
                          }}
                          disabled={isOptimizing}
                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isOptimizing
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : selectedTestCasesCount > 0
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          }`}
                          title={
                            selectedTestCasesCount > 0
                              ? "Optimize selected test cases"
                              : "Select test cases first"
                          }
                        >
                          {isOptimizing ? (
                            <>
                              <svg
                                className="animate-spin h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              <span>Optimizing...</span>
                            </>
                          ) : (
                            <>
                              <CogIcon className="h-4 w-4" />
                              <span>Optimize</span>
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Expanded Prompt Content - Show Clusters */}
              {expandedPrompts.has(promptIndex) && (
                <div className="p-4 space-y-4">
                  {/* Full Prompt */}
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">
                      Full Prompt:
                    </h5>
                    <div className="text-sm text-gray-700 max-h-32 overflow-y-auto">
                      {promptCluster.prompt}
                    </div>
                  </div>

                  {/* Error Clusters for this Prompt */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-semibold text-gray-900">
                      Error Clusters ({promptCluster.clusters.length})
                    </h5>

                    {promptCluster.clusters.map((cluster: any) => {
                      return (
                        <div
                          key={cluster.id}
                          className={`border rounded-lg ${getClusterColor(cluster.id)}`}
                        >
                          {/* Cluster Header */}
                          <div className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div>
                                  <h6 className="text-md font-semibold text-gray-900">
                                    {cluster.category.name}
                                  </h6>
                                  <p className="text-sm text-gray-600">
                                    {cluster.category.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="text-center">
                                  <div className="text-md font-bold text-gray-900">
                                    {cluster.size}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    tests
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() =>
                                      handleShowClusterDetail(
                                        cluster,
                                        promptIndex,
                                      )
                                    }
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                    title="View cluster details"
                                  >
                                    <InformationCircleIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleShowTestCases(cluster, promptIndex)
                                    }
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                    title="View test cases"
                                  >
                                    <ListBulletIcon className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Representative Error */}
                            <div className="mt-2">
                              <div className="text-xs font-medium text-gray-700 mb-1">
                                Representative Error:
                              </div>
                              <div className="text-xs text-gray-600 bg-white bg-opacity-50 rounded p-2">
                                {truncateText(cluster.representativeError, 150)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cluster Detail Modal */}
      {showDetailModal && selectedCluster && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Cluster Details: {selectedCluster.category.name}
              </h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedCluster.category.description}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Representative Error
                  </h4>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedCluster.representativeError}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Cluster Size
                    </h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedCluster.size}
                    </p>
                    <p className="text-xs text-gray-500">failed test cases</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Category
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedCluster.category.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Cases Modal (refactored to use TestCasesDialog) */}
      <TestCasesDialog
        open={showTestCasesModal && !!selectedCluster}
        onClose={closeModals}
        title="Failed Test Cases"
        testCases={
          selectedCluster
            ? selectedCluster.tests.map((test: any) => ({
                id: test.id,
                vars: {
                  query: test.vars.query,
                  expectedAnswer: test.vars.expectedAnswer,
                },
                response: test.response,
                score: test.score,
                reason: test.reason,
              }))
            : []
        }
        categoryName={selectedCluster?.category?.name}
        clusterId={selectedCluster?.id}
        promptId={selectedPromptIndex.toString()}
      />
    </div>
  );
};

export default ErrorClusteringView;
