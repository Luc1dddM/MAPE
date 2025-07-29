import React, { useState } from 'react';
import { Card, Badge, CopyButton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { evaluationService } from '@/services/api';
import ErrorClusteringView from './ErrorClusteringView';
import {
  EvaluationResult,
  EvaluationSummary,
  EvaluationMetadata,
  ErrorClusteringResults
} from '@/types/api';
import toast from 'react-hot-toast';
import { cn } from '@/utils';

interface EvaluationResultsProps {
  summary: EvaluationSummary;
  results: EvaluationResult[];
  metadata: EvaluationMetadata;
  evaluationId: string;
  errorClusters?: ErrorClusteringResults;
}

export const EvaluationResults: React.FC<EvaluationResultsProps> = ({
  summary,
  results,
  metadata,
  evaluationId,
  errorClusters
}) => {
  const [activeTab, setActiveTab] = useState<'results' | 'clusters'>('results');

  const handleDownload = async () => {
    try {
      await evaluationService.downloadEvaluation(evaluationId);
      toast.success('Results downloaded successfully!');
    } catch (error: any) {
      toast.error(`Failed to download results: ${error.message}`);
    }
  };

  console.log('Evaluation Results:', results)

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card title="Evaluation Summary">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.totalTests}</div>
            <div className="text-sm text-gray-600">Total Tests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.passedTests}</div>
            <div className="text-sm text-gray-600">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summary.failedTests}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {summary.averageScore.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Average Score</div>
          </div>
        </div>

        {/* Download Button */}
        <div className="mt-4 flex justify-end">
          <Button onClick={handleDownload} variant="outline" size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Results
          </Button>
        </div>
      </Card>

      {/* Tabs for Results and Error Clusters */}
      {summary.failedTests > 0 && errorClusters && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('results')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Test Results
            </button>
            <button
              onClick={() => setActiveTab('clusters')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clusters'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Error Analysis ({errorClusters.summary.clustersFound} patterns)
            </button>
          </nav>
        </div>
      )}



      {/* Tab Content */}
      {activeTab === 'results' && (
        <Card title="Test Results">
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={result.id || index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge
                      variant={result.passed ? 'success' : 'error'}
                      className="text-xs"
                    >
                      {result.passed ? 'PASSED' : 'FAILED'}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      Test #{index + 1}
                    </span>
                    <span className="text-sm font-medium">
                      Score: {result.score.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {result.latencyMs}ms
                  </div>
                </div>

                {/* Prompt and Response */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Prompt</h4>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      {result.prompt || 'No prompt available'}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Response</h4>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      {result.response || 'No response available'}
                    </div>
                  </div>
                </div>


                {/* Reason */}
                  <div className="mt-3">
                    <h4 className={cn("text-sm font-medium mb-2", result.passed ? "text-green-700" : "text-red-700")}>Details</h4>
                    <div className={cn(" border p-3 rounded text-sm", result.passed ? "text-green-800 bg-green-50" : "text-red-800 bg-red-50")}>
                      {result.reason}
                    </div>
                  </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Error Clustering Tab */}
      {activeTab === 'clusters' && errorClusters && (
        <Card title="Error Pattern Analysis">
          <ErrorClusteringView clusteringResults={errorClusters} />
        </Card>
      )}

      {/* Metadata */}
      <Card title="Evaluation Metadata">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Evaluation ID:</span>
            <div className="text-gray-600 font-mono">{evaluationId}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Timestamp:</span>
            <div className="text-gray-600">
              {new Date(metadata.timestamp).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Version:</span>
            <div className="text-gray-600">{metadata.version}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

interface AssertionCardProps {
  assertion: {
    type: string;
    passed: boolean;
    score?: number;
    maxScore?: number;
    reason?: string;
    value?: string;
  };
}

const AssertionCard: React.FC<AssertionCardProps> = ({ assertion }) => {
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const score = assertion.score ?? 0;
  const maxScore = assertion.maxScore ?? 10;
  const percentage = (score / maxScore) * 100;

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">
            {assertion.type}
          </span>
          <Badge variant={assertion.passed ? 'success' : 'error'} className="text-xs">
            {assertion.passed ? 'Pass' : 'Fail'}
          </Badge>
        </div>
        {assertion.score !== undefined && assertion.maxScore !== undefined && (
          <span className={`text-sm font-medium ${getScoreColor(score, maxScore)}`}>
            {score.toFixed(1)}/{maxScore}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {assertion.score !== undefined && assertion.maxScore !== undefined && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(score, maxScore)}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Reason */}
      {assertion.reason && (
        <p className="text-xs text-gray-600 mt-1">
          {assertion.reason}
        </p>
      )}
    </div>
  );
};
