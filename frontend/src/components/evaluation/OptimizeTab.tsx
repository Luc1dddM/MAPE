import React, { useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { Card, Button } from "@/components/ui";
import { OptimizePromptResponse } from "@/services/optimize";
import toast from "react-hot-toast";

interface OptimizeTabProps {
  optimizationData: OptimizePromptResponse | null;
  isLoading?: boolean;
  onOptimizeAgain?: () => void;
  onComparePrompts?: (originalPrompt: string, optimizedPrompt: string) => void;
}

const OptimizeTab: React.FC<OptimizeTabProps> = ({
  optimizationData,
  isLoading = false,
  onOptimizeAgain,
  onComparePrompts,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["summary", "comparison", "improvements", "metadata"])
  );
  const [promptView, setPromptView] = useState<"side-by-side" | "tabbed">("side-by-side");
  const [activePromptTab, setActivePromptTab] = useState<"original" | "optimized">("original");

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const exportResults = () => {
    if (!optimizationData?.success || !optimizationData.data) return;

    const exportData = {
      optimizationResults: optimizationData.data,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `optimization-results-${optimizationData.data.metadata.promptId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Optimization results exported!");
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const calculateImprovement = (original: number, optimized: number) => {
    const improvement = ((optimized - original) / original) * 100;
    return improvement > 0 ? `+${improvement.toFixed(1)}%` : `${improvement.toFixed(1)}%`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="text-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Optimizing Prompt...
              </h3>
              <p className="text-gray-600">
                Please wait while we analyze and improve your prompt.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (optimizationData && !optimizationData.success) {
    return (
      <div className="space-y-6">
        <Card className="text-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <XCircleIcon className="h-12 w-12 text-red-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Optimization Failed
              </h3>
              <p className="text-gray-600 mb-4">
                {optimizationData.error || "An error occurred during optimization."}
              </p>
              {onOptimizeAgain && (
                <Button onClick={onOptimizeAgain} variant="outline">
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // No data state
  if (!optimizationData || !optimizationData.data) {
    return (
      <div className="space-y-6">
        <Card className="text-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <LightBulbIcon className="h-12 w-12 text-gray-400" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Optimization Results
              </h3>
              <p className="text-gray-600 mb-4">
                Select test cases from the Error Analysis tab and click "Optimize" to see results here.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const { data } = optimizationData;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Optimization Results</h2>
        <div className="flex space-x-3">
          {onComparePrompts && (
            <Button
              onClick={() => onComparePrompts(data.originalPrompt, data.optimizedPrompt)}
              variant="outline"
              size="sm"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Compare Performance
            </Button>
          )}
          <Button onClick={exportResults} variant="outline" size="sm">
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          {onOptimizeAgain && (
            <Button onClick={onOptimizeAgain} size="sm">
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Optimize Again
            </Button>
          )}
        </div>
      </div>

      {/* Optimization Results Summary */}
      <Card>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection("summary")}
        >
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Optimization Summary
            </h3>
          </div>
          {expandedSections.has("summary") ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
          )}
        </div>

        {expandedSections.has("summary") && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-green-900">Success</div>
              <div className="text-sm text-green-700">Optimization Completed</div>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <ChartBarIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-blue-900">
                {data.metadata.clustersAnalyzed}
              </div>
              <div className="text-sm text-blue-700">Clusters Analyzed</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <DocumentTextIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-purple-900">
                {calculateImprovement(data.metadata.originalLength, data.metadata.optimizedLength)}
              </div>
              <div className="text-sm text-purple-700">Length Change</div>
            </div>
          </div>
        )}
      </Card>

      {/* Prompt Comparison */}
      <Card>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection("comparison")}
        >
          <h3 className="text-lg font-semibold text-gray-900">Prompt Comparison</h3>
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPromptView("side-by-side");
                }}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  promptView === "side-by-side"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Side-by-Side
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPromptView("tabbed");
                }}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  promptView === "tabbed"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Tabbed
              </button>
            </div>
            {expandedSections.has("comparison") ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </div>

        {expandedSections.has("comparison") && (
          <div className="mt-6">
            {promptView === "side-by-side" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original Prompt */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900">Original Prompt</h4>
                    <Button
                      onClick={() => copyToClipboard(data.originalPrompt, "Original prompt")}
                      variant="outline"
                      size="sm"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {data.originalPrompt}
                    </pre>
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.metadata.originalLength} characters
                  </div>
                </div>

                {/* Optimized Prompt */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900">Optimized Prompt</h4>
                    <Button
                      onClick={() => copyToClipboard(data.optimizedPrompt, "Optimized prompt")}
                      variant="outline"
                      size="sm"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {data.optimizedPrompt}
                    </pre>
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.metadata.optimizedLength} characters
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActivePromptTab("original")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activePromptTab === "original"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Original Prompt ({data.metadata.originalLength} chars)
                  </button>
                  <button
                    onClick={() => setActivePromptTab("optimized")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activePromptTab === "optimized"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Optimized Prompt ({data.metadata.optimizedLength} chars)
                  </button>
                </div>

                {/* Tab Content */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900">
                      {activePromptTab === "original" ? "Original" : "Optimized"} Prompt
                    </h4>
                    <Button
                      onClick={() =>
                        copyToClipboard(
                          activePromptTab === "original" ? data.originalPrompt : data.optimizedPrompt,
                          `${activePromptTab === "original" ? "Original" : "Optimized"} prompt`
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div
                    className={`border rounded-lg p-4 max-h-96 overflow-y-auto ${
                      activePromptTab === "original"
                        ? "bg-gray-50 border-gray-200"
                        : "bg-green-50 border-green-200"
                    }`}
                  >
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {activePromptTab === "original" ? data.originalPrompt : data.optimizedPrompt}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Improvements List */}
      <Card>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection("improvements")}
        >
          <div className="flex items-center space-x-3">
            <LightBulbIcon className="h-6 w-6 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Key Improvements ({data.improvements.length})
            </h3>
          </div>
          {expandedSections.has("improvements") ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
          )}
        </div>

        {expandedSections.has("improvements") && (
          <div className="mt-6">
            <div className="space-y-3">
              {data.improvements.map((improvement, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700 flex-1">{improvement}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Metadata Information */}
      <Card>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection("metadata")}
        >
          <div className="flex items-center space-x-3">
            <CalendarIcon className="h-6 w-6 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Optimization Details</h3>
          </div>
          {expandedSections.has("metadata") ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
          )}
        </div>

        {expandedSections.has("metadata") && (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Original Length</label>
                  <div className="text-lg text-gray-900">{data.metadata.originalLength} characters</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Optimized Length</label>
                  <div className="text-lg text-gray-900">{data.metadata.optimizedLength} characters</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Length Change</label>
                  <div className={`text-lg font-medium ${
                    data.metadata.optimizedLength > data.metadata.originalLength
                      ? "text-blue-600"
                      : "text-green-600"
                  }`}>
                    {calculateImprovement(data.metadata.originalLength, data.metadata.optimizedLength)}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Clusters Analyzed</label>
                  <div className="text-lg text-gray-900">{data.metadata.clustersAnalyzed}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Optimization Time</label>
                  <div className="text-lg text-gray-900">{formatTimestamp(data.metadata.optimizedAt)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Prompt ID</label>
                  <div className="text-sm text-gray-600 font-mono break-all">
                    {data.metadata.promptId}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OptimizeTab;