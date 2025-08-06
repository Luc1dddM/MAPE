import React, { useState } from "react";
import {
  XMarkIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import { Card, Button } from "@/components/ui";
import { ComparePromptsResponse } from "@/services/optimize";
import toast from "react-hot-toast";

interface ComparePromptsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  comparisonData: ComparePromptsResponse | null;
  originalPrompt: string;
  optimizedPrompt: string;
}

const ComparePromptsDialog: React.FC<ComparePromptsDialogProps> = ({
  isOpen,
  onClose,
  comparisonData,
  originalPrompt,
  optimizedPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "details">("overview");

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const getMetricIcon = (change: number) => {
    if (change > 0) return <ArrowTrendingUpIcon className="h-4 w-4 text-gray-600" />;
    if (change < 0) return <ArrowTrendingDownIcon className="h-4 w-4 text-gray-600" />;
    return <MinusIcon className="h-4 w-4 text-gray-600" />;
  };

  const getMetricColor = (change: number) => {
    if (change > 0) return "text-gray-700";
    if (change < 0) return "text-gray-700";
    return "text-gray-600";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <ChartBarIcon className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Prompt Comparison Results
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {comparisonData?.success ? (
              <div className="space-y-6">
                {/* Tab Navigation */}
                <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === "overview"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab("details")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === "details"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Detailed Analysis
                  </button>
                </div>

                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    {/* Performance Metrics */}
                    {comparisonData.data?.comparison && (
                      <Card className="p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                          <ChartBarIcon className="h-5 w-5" />
                          <span>Performance Comparison</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                          {/* Original Performance */}
                          <div className="text-center">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Original Prompt</h4>
                            <div className="space-y-2">
                              <div>
                                <div className="text-2xl font-bold text-gray-900">
                                  {comparisonData.data.comparison.original.performance.averageScore.toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">Average Score</div>
                              </div>
                              <div>
                                <div className="text-xl font-semibold text-gray-900">
                                  {(comparisonData.data.comparison.original.performance.passRate * 100).toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-600">Pass Rate</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Optimized Performance */}
                          <div className="text-center">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Optimized Prompt</h4>
                            <div className="space-y-2">
                              <div>
                                <div className="text-2xl font-bold text-gray-900">
                                  {comparisonData.data.comparison.optimized.performance.averageScore.toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">Average Score</div>
                              </div>
                              <div>
                                <div className="text-xl font-semibold text-gray-900">
                                  {(comparisonData.data.comparison.optimized.performance.passRate * 100).toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-600">Pass Rate</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Improvements */}
                    {comparisonData.data?.comparison?.improvements && comparisonData.data.comparison.improvements.length > 0 && (
                      <Card className="p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">
                          Improvements Made
                        </h3>
                        <ul className="space-y-2">
                          {comparisonData.data.comparison.improvements.map((improvement, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="text-gray-400 mt-1">•</span>
                              <span className="text-gray-700">{improvement}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}

                    {/* Recommendations */}
                    {comparisonData.data?.comparison?.recommendations && comparisonData.data.comparison.recommendations.length > 0 && (
                      <Card className="p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">
                          Recommendations
                        </h3>
                        <ul className="space-y-2">
                          {comparisonData.data.comparison.recommendations.map((recommendation, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="text-gray-400 mt-1">•</span>
                              <span className="text-gray-700">{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </div>
                )}

                {/* Details Tab */}
                {activeTab === "details" && (
                  <div className="space-y-6">
                    {/* Prompt Comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Original Prompt */}
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            Original Prompt
                          </h3>
                          <button
                            onClick={() => handleCopy(originalPrompt, "Original prompt")}
                            className="p-2 text-gray-400 hover:text-gray-600"
                          >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border max-h-64 overflow-y-auto">
                          {originalPrompt}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {originalPrompt.length} characters
                        </div>
                      </Card>

                      {/* Optimized Prompt */}
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            Optimized Prompt
                          </h3>
                          <button
                            onClick={() => handleCopy(optimizedPrompt, "Optimized prompt")}
                            className="p-2 text-gray-400 hover:text-gray-600"
                          >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border max-h-64 overflow-y-auto">
                          {optimizedPrompt}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {optimizedPrompt.length} characters
                        </div>
                      </Card>
                    </div>

                    {/* Common Issues Comparison */}
                    {comparisonData.data?.comparison && (
                      <Card className="p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">
                          Common Issues Analysis
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Original Issues */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Original Prompt Issues</h4>
                            {comparisonData.data.comparison.original.performance.commonIssues.length > 0 ? (
                              <ul className="space-y-1">
                                {comparisonData.data.comparison.original.performance.commonIssues.map((issue, index) => (
                                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                                    <span className="text-gray-400 mt-1">•</span>
                                    <span>{issue}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-500">No common issues identified</p>
                            )}
                          </div>

                          {/* Optimized Issues */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Optimized Prompt Issues</h4>
                            {comparisonData.data.comparison.optimized.performance.commonIssues.length > 0 ? (
                              <ul className="space-y-1">
                                {comparisonData.data.comparison.optimized.performance.commonIssues.map((issue, index) => (
                                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                                    <span className="text-gray-400 mt-1">•</span>
                                    <span>{issue}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-500">No common issues identified</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <XCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Comparison Failed
                </h3>
                <p className="text-gray-600">
                  {comparisonData?.error || "Unable to compare the prompts. Please try again."}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparePromptsDialog;