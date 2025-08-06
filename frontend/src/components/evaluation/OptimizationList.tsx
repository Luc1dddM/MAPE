import React, { useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui";
import {
  useOptimizationStore,
  OptimizationResult,
} from "@/stores/optimizationStore";
import toast from "react-hot-toast";

interface OptimizationListProps {
  evaluationId?: string;
  onSelectOptimization?: (optimization: OptimizationResult) => void;
}

const OptimizationList: React.FC<OptimizationListProps> = ({
  evaluationId,
  onSelectOptimization,
}) => {
  const {
    optimizations,
    selectedOptimizationId,
    setSelectedOptimization,
    removeOptimization,
    getOptimizationsByEvaluation,
    clearOptimizations,
  } = useOptimizationStore();

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Filter optimizations by evaluation if provided
  const displayOptimizations = evaluationId
    ? getOptimizationsByEvaluation(evaluationId)
    : optimizations;

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleSelectOptimization = (optimization: OptimizationResult) => {
    setSelectedOptimization(optimization.id);
    if (onSelectOptimization) {
      onSelectOptimization(optimization);
    }
  };

  const handleRemoveOptimization = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeOptimization(id);
    toast.success("Optimization removed");
  };

  const copyPromptToClipboard = async (
    prompt: string,
    type: "original" | "optimized",
  ) => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success(
        `${type === "original" ? "Original" : "Optimized"} prompt copied!`,
      );
    } catch (error) {
      toast.error("Failed to copy prompt");
    }
  };

  const getStatusIcon = (status: OptimizationResult["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "pending":
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-pulse" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: OptimizationResult["status"]) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "pending":
        return "In Progress";
      default:
        return "Unknown";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const calculateImprovement = (original: number, optimized: number) => {
    if (optimized === 0) return "N/A";
    const improvement = ((optimized - original) / original) * 100;
    return improvement > 0
      ? `+${improvement.toFixed(1)}%`
      : `${improvement.toFixed(1)}%`;
  };

  if (displayOptimizations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">
          <div className="text-lg font-medium mb-2">No Optimizations Yet</div>
          <p>
            {evaluationId
              ? "No optimizations found for this evaluation."
              : "Start optimizing prompts to see results here."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Optimization History ({displayOptimizations.length})
        </h3>
        {displayOptimizations.length > 0 && (
          <Button
            onClick={() => {
              clearOptimizations();
              toast.success("All optimizations cleared");
            }}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Optimization List */}
      <div className="space-y-3">
        {displayOptimizations.map((optimization) => (
          <div
            key={optimization.id}
            className={`border rounded-lg transition-all duration-200 ${
              selectedOptimizationId === optimization.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            {/* Header */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => handleSelectOptimization(optimization)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(optimization.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    {expandedItems.has(optimization.id) ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                    )}
                  </button>

                  <div className="flex items-center space-x-2">
                    {getStatusIcon(optimization.status)}
                    <div>
                      <div className="font-medium text-gray-900">
                        Prompt #{optimization.promptIndex + 1} -{" "}
                        {getStatusText(optimization.status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTimestamp(optimization.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {optimization.status === "completed" && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {optimization.improvements.length} improvements
                      </div>
                      <div className="text-xs text-gray-500">
                        {calculateImprovement(
                          optimization.metadata.originalLength,
                          optimization.metadata.optimizedLength,
                        )}{" "}
                        length change
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectOptimization(optimization);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View
                  </Button>

                  <Button
                    onClick={(e) =>
                      handleRemoveOptimization(optimization.id, e)
                    }
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedItems.has(optimization.id) && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="mt-4 space-y-4">
                  {/* Status and Error */}
                  {optimization.status === "failed" && optimization.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="text-sm text-red-800">
                        <strong>Error:</strong> {optimization.error}
                      </div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  {optimization.status === "completed" && (
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-lg font-bold text-gray-900">
                          {optimization.metadata.clustersAnalyzed}
                        </div>
                        <div className="text-xs text-gray-500">Clusters</div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-lg font-bold text-gray-900">
                          {optimization.improvements.length}
                        </div>
                        <div className="text-xs text-gray-500">
                          Improvements
                        </div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-lg font-bold text-gray-900">
                          {optimization.selectedTestCases.length}
                        </div>
                        <div className="text-xs text-gray-500">Test Cases</div>
                      </div>
                    </div>
                  )}

                  {/* Prompt Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-700">
                          Original
                        </h5>
                        <Button
                          onClick={() =>
                            copyPromptToClipboard(
                              optimization.originalPrompt,
                              "original",
                            )
                          }
                          variant="outline"
                          size="sm"
                        >
                          <DocumentDuplicateIcon className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                        {optimization.originalPrompt.substring(0, 150)}
                        {optimization.originalPrompt.length > 150 && "..."}
                      </div>
                    </div>

                    {optimization.status === "completed" && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-700">
                            Optimized
                          </h5>
                          <Button
                            onClick={() =>
                              copyPromptToClipboard(
                                optimization.optimizedPrompt,
                                "optimized",
                              )
                            }
                            variant="outline"
                            size="sm"
                          >
                            <DocumentDuplicateIcon className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-xs text-gray-600 bg-green-50 p-2 rounded max-h-20 overflow-y-auto">
                          {optimization.optimizedPrompt.substring(0, 150)}
                          {optimization.optimizedPrompt.length > 150 && "..."}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OptimizationList;
