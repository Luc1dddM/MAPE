import React, { useState, useEffect } from "react";
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
  ClockIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Card, Button } from "@/components/ui";
import { OptimizePromptResponse } from "@/services/optimize";
import {
  useOptimizationStore,
  OptimizationResult,
} from "@/stores/optimizationStore";
import toast from "react-hot-toast";
import { ComparePromptsDialog } from "./dialogs";
import { optimizeService, ComparePromptsResponse } from "@/services/optimize";

interface OptimizeTabProps {
  optimizationData: OptimizePromptResponse | null;
  isLoading?: boolean;
  onOptimizeAgain?: () => void;
  onComparePrompts?: (originalPrompt: string, optimizedPrompt: string) => void;
  evaluationId?: string;
}

const OptimizeTab: React.FC<OptimizeTabProps> = ({
  optimizationData,
  isLoading = false,
  onOptimizeAgain,
  onComparePrompts,
  evaluationId,
}) => {
  // Local state for comparison modal
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparePromptsResponse | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [currentComparison, setCurrentComparison] = useState<{
    original: string;
    optimized: string;
    optimizationId: string;
  } | null>(null);

  // Get optimization store
  const {
    optimizations,
    selectedOptimizationId,
    setSelectedOptimization,
    removeOptimization,
  } = useOptimizationStore();

  // Handle store hydration and autoload history
  useEffect(() => {
    if (typeof window !== 'undefined') {
      useOptimizationStore.persist.rehydrate();
    }
  }, []);

  // Auto-load all optimizations from localStorage on mount
  useEffect(() => {
    console.log("Autoloaded optimizations from localStorage:", optimizations.length);
  }, [optimizations]);

  // Handle prompt comparison
  const handleComparePrompts = async (originalPrompt: string, optimizedPrompt: string, optimizationId: string) => {
    // Check if we already have comparison data for this optimization
    if (currentComparison?.optimizationId === optimizationId && comparisonData?.success) {
      // Already compared, just show the modal
      setIsCompareModalOpen(true);
      return;
    }

    setIsComparing(true);
    setCurrentComparison({ original: originalPrompt, optimized: optimizedPrompt, optimizationId });

    try {
      const result = await optimizeService.comparePrompts({
        originalPrompt,
        optimizedPrompt,
      });

      setComparisonData(result);
      setIsCompareModalOpen(true);

      if (result.success) {
        toast.success("Prompt comparison completed!");
      } else {
        toast.error(result.error || "Comparison failed");
      }
    } catch (error) {
      console.error("Comparison error:", error);
      toast.error("Failed to compare prompts");
      setComparisonData({
        success: false,
        error: "Failed to compare prompts",
        data: null as any,
      });
    } finally {
      setIsComparing(false);
    }
  };

  const handleCloseCompareModal = () => {
    setIsCompareModalOpen(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="text-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <ArrowPathIcon className="h-12 w-12 text-gray-400 animate-spin" />
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

  // Show simplified optimization history view
  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SparklesIcon className="h-6 w-6 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Optimization History</h2>
        </div>
        <div className="text-sm text-gray-500">
          {optimizations.length} total optimizations
        </div>
      </div>

      {/* Optimization Cards */}
      {optimizations.length === 0 ? (
        <Card className="text-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <LightBulbIcon className="h-12 w-12 text-gray-400" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Optimizations Yet
              </h3>
              <p className="text-gray-600">
                Run an optimization from the Error Analysis tab to see results here.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {optimizations
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((optimization) => (
              <OptimizationCard
                key={optimization.id}
                optimization={optimization}
                isSelected={selectedOptimizationId === optimization.id}
                onSelect={() => setSelectedOptimization(optimization.id)}
                onDelete={() => removeOptimization(optimization.id)}
                onComparePrompts={(original, optimized) => 
                  handleComparePrompts(original, optimized, optimization.id)
                }
                isComparing={isComparing && currentComparison?.optimizationId === optimization.id}
              />
            ))}
        </div>
      )}

      {/* Comparison Modal */}
      <ComparePromptsDialog
        isOpen={isCompareModalOpen}
        onClose={handleCloseCompareModal}
        comparisonData={comparisonData}
        originalPrompt={currentComparison?.original || ""}
        optimizedPrompt={currentComparison?.optimized || ""}
      />
    </div>
  );
};

// Simple Optimization Card Component
interface OptimizationCardProps {
  optimization: OptimizationResult;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onComparePrompts?: (originalPrompt: string, optimizedPrompt: string) => void;
  isComparing?: boolean;
}

const OptimizationCard: React.FC<OptimizationCardProps> = ({
  optimization,
  isSelected,
  onSelect,
  onDelete,
  onComparePrompts,
  isComparing = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="h-5 w-5 text-gray-600" />;
      case "failed":
        return <XCircleIcon className="h-5 w-5 text-gray-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleCompare = () => {
    if (onComparePrompts) {
      onComparePrompts(optimization.originalPrompt, optimization.optimizedPrompt);
    }
  };

  return (
    <Card className={`transition-all ${isSelected ? "ring-2 ring-gray-300" : ""}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(optimization.status)}
            <div>
              <div className="font-medium text-gray-900">
                Prompt {optimization.promptIndex + 1}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(optimization.createdAt).toLocaleDateString()} at{" "}
                {new Date(optimization.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={onSelect}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Select optimization"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            {onComparePrompts && (
              <button
                onClick={handleCompare}
                disabled={isComparing}
                className={`p-1 transition-colors ${
                  isComparing 
                    ? "text-gray-300 cursor-not-allowed" 
                    : "text-gray-400 hover:text-gray-600"
                }`}
                title={isComparing ? "Comparing..." : "Compare prompts"}
              >
                {isComparing ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <ChartBarIcon className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600"
              title="Delete optimization"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-3 flex items-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <DocumentTextIcon className="h-4 w-4" />
            <span>{optimization.metadata.originalLength} → {optimization.metadata.optimizedLength} chars</span>
          </div>
          <div className="flex items-center space-x-1">
            <SparklesIcon className="h-4 w-4" />
            <span>{optimization.improvements.length} improvements</span>
          </div>
          <div className="flex items-center space-x-1">
            <ChartBarIcon className="h-4 w-4" />
            <span>{optimization.metadata.clustersAnalyzed} clusters</span>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {/* Original Prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Original Prompt</span>
                <button
                  onClick={() => handleCopy(optimization.originalPrompt)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Copy original prompt"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                {optimization.originalPrompt}
              </div>
            </div>

            {/* Optimized Prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Optimized Prompt</span>
                <button
                  onClick={() => handleCopy(optimization.optimizedPrompt)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Copy optimized prompt"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                {optimization.optimizedPrompt}
              </div>
            </div>

            {/* Improvements */}
            {optimization.improvements.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-700">Improvements</span>
                <ul className="mt-2 space-y-1">
                  {optimization.improvements.map((improvement, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                      <span className="text-gray-400">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default OptimizeTab;