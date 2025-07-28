import React, { useState } from 'react';
import { Card, Badge, CopyButton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { evaluationService } from '@/services/api';
import { 
  EvaluationResult, 
  EvaluationSummary, 
  EvaluationMetadata,
  AssertionResult 
} from '@/types/api';

interface EvaluationResultsProps {
  summary: EvaluationSummary;
  results: EvaluationResult[];
  metadata: EvaluationMetadata;
  evaluationId: string;
}

export const EvaluationResults: React.FC<EvaluationResultsProps> = ({
  summary,
  results,
  metadata,
  evaluationId
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-600';
    if (score >= 60) return 'text-warning-600';
    return 'text-error-600';
  };

  const getScoreBadgeVariant = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const handleDownload = async (format: 'json' | 'csv') => {
    try {
      setIsDownloading(true);
      const blob = await evaluationService.downloadEvaluation(evaluationId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `evaluation-${evaluationId}-${timestamp}.${format}`;
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download evaluation results. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Evaluation Results</h2>
          <p className="text-gray-600 mt-1">
            Evaluation ID: {evaluationId} • {new Date(metadata.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Button
              onClick={() => handleDownload('json')}
              disabled={isDownloading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              JSON
            </Button>
            <Button
              onClick={() => handleDownload('csv')}
              disabled={isDownloading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              CSV
            </Button>
          </div>
          <CopyButton text={evaluationId} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-gray-900">{summary.totalTests}</div>
          <div className="text-sm text-gray-600">Total Tests</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl font-bold text-success-600">{summary.passedTests}</div>
          <div className="text-sm text-gray-600">Passed</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl font-bold text-error-600">{summary.failedTests}</div>
          <div className="text-sm text-gray-600">Failed</div>
        </Card>
        
        <Card className="text-center">
          <div className={`text-2xl font-bold ${getScoreColor(summary.averageScore)}`}>
            {summary.averageScore.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Average Score</div>
        </Card>
      </div>

      {/* Metadata */}
      <Card title="Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Prompts ({metadata.prompts.length})</h4>
            <div className="space-y-2">
              {metadata.prompts.slice(0, 3).map((prompt, index) => (
                <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {prompt.length > 100 ? `${prompt.substring(0, 100)}...` : prompt}
                </div>
              ))}
              {metadata.prompts.length > 3 && (
                <p className="text-sm text-gray-500">
                  +{metadata.prompts.length - 3} more prompts
                </p>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Providers</h4>
            <div className="space-y-1">
              {metadata.providers.map((provider, index) => (
                <Badge key={index} variant="primary">
                  {provider.name || provider.id}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Detailed Results */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Detailed Results</h3>
        
        {results.map((result) => (
          <Card key={result.id} className="relative">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium text-gray-900">Test {result.id + 1}</h4>
                  <Badge variant={result.passed ? 'success' : 'error'}>
                    {result.passed ? 'Passed' : 'Failed'}
                  </Badge>
                  <Badge variant={getScoreBadgeVariant(result.score)}>
                    {result.score.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <CopyButton text={result.response} />
            </div>

            {/* Prompt */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-1">Prompt</h5>
              <div className="bg-gray-50 rounded p-3 text-sm font-mono">
                {result.prompt}
              </div>
            </div>

            {/* Response */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-1">Response</h5>
              <div className="bg-gray-50 rounded p-3 text-sm">
                {result.response}
              </div>
            </div>

            {/* Assertions */}
            {result.assertions.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Evaluation Criteria ({result.assertions.length})
                </h5>
                <div className="space-y-2">
                  {result.assertions.map((assertion, index) => (
                    <AssertionCard key={index} assertion={assertion} />
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {results.length === 0 && (
        <Card className="text-center py-12">
          <div className="text-gray-500">
            <div className="text-lg font-medium mb-2">No Results Found</div>
            <p>The evaluation completed but no results were generated.</p>
          </div>
        </Card>
      )}
    </div>
  );
};

interface AssertionCardProps {
  assertion: AssertionResult;
}

const AssertionCard: React.FC<AssertionCardProps> = ({ assertion }) => {
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-success-600';
    if (percentage >= 60) return 'text-warning-600';
    return 'text-error-600';
  };

  const getProgressBarColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-success-500';
    if (percentage >= 60) return 'bg-warning-500';
    return 'bg-error-500';
  };

  const percentage = (assertion.score / assertion.maxScore) * 100;

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">
            {assertion.metric || assertion.type}
          </span>
          <Badge variant={assertion.passed ? 'success' : 'error'} className="text-xs">
            {assertion.passed ? 'Pass' : 'Fail'}
          </Badge>
        </div>
        <span className={`text-sm font-medium ${getScoreColor(assertion.score, assertion.maxScore)}`}>
          {assertion.score.toFixed(1)}/{assertion.maxScore}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(assertion.score, assertion.maxScore)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
      
      {/* Reason */}
      {assertion.reason && (
        <p className="text-xs text-gray-600 mt-1">
          {assertion.reason}
        </p>
      )}
    </div>
  );
};
