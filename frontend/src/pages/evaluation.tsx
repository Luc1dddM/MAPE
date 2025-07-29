import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tab } from '@headlessui/react';
import { EvaluationForm } from '@/components/evaluation/EvaluationForm';
import { EvaluationResults } from '@/components/evaluation/EvaluationResults';
import { Card, LoadingSpinner, Button } from '@/components/ui';
import { evaluationService } from '@/services/api';
import { 
  EvaluationSummary, 
  EvaluationResult, 
  EvaluationMetadata,
  ErrorClusteringResults
} from '@/types/api';

// Define EvaluationStatus type locally since it's not exported
interface EvaluationStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: {
    completed: number;
    total: number;
  };
  message?: string;
  error?: string;
}

export default function EvaluationPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [currentEvaluationId, setCurrentEvaluationId] = useState<string | null>(null);
  const [currentEvaluationResults, setCurrentEvaluationResults] = useState<{
    summary: EvaluationSummary;
    results: EvaluationResult[];
    metadata: EvaluationMetadata;
    evaluationId: string;
    configPath: string;
    timestamp: string;
    errorClusters?: ErrorClusteringResults;
  } | null>(null);

  const handleEvaluationStart = (evaluationData: {
    summary: EvaluationSummary;
    results: EvaluationResult[];
    metadata: EvaluationMetadata;
    evaluationId: string;
    configPath: string;
    timestamp: string;
    errorClusters?: ErrorClusteringResults;
  }) => {
    setCurrentEvaluationId(evaluationData.evaluationId);
    setCurrentEvaluationResults(evaluationData);
    setSelectedTab(1); // Switch to status tab
  };

  console.log('Current Evaluation ID:', currentEvaluationResults);

  // Query for evaluation list
  const { data: evaluations = [] } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => evaluationService.listEvaluations(),
  });

  const tabs = [
    { name: 'New Evaluation', component: 'form' },
    { name: 'Status & Results', component: 'results' },
    { name: 'History', component: 'history' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Prompt Evaluation</h1>
          <p className="text-gray-600 mt-2">
            Generate, configure, and run comprehensive prompt evaluations
          </p>
        </div>

        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8">
            {tabs.map((tab, index) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                    selected
                      ? 'bg-white shadow'
                      : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                  }`
                }
              >
                {tab.name}
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels>
            {/* New Evaluation Tab */}
            <Tab.Panel>
              <EvaluationForm onEvaluationStart={handleEvaluationStart} />
            </Tab.Panel>

            {/* Status & Results Tab */}
            <Tab.Panel>
              {currentEvaluationId ? (
                <EvaluationStatusView
                  evaluationId={currentEvaluationId}
                  status={null}
                  results={currentEvaluationResults}
                />
              ) : (
                <Card className="text-center py-12">
                  <div className="text-gray-500">
                    <div className="text-lg font-medium mb-2">No Active Evaluation</div>
                    <p>Start a new evaluation to see status and results here.</p>
                    <Button
                      onClick={() => setSelectedTab(0)}
                      className="mt-4"
                    >
                      Create New Evaluation
                    </Button>
                  </div>
                </Card>
              )}
            </Tab.Panel>

            {/* History Tab */}
            <Tab.Panel>
              <EvaluationHistory
                evaluations={Array.isArray(evaluations) ? evaluations : (evaluations?.data?.evaluations || [])}
                onSelectEvaluation={(id) => {
                  setCurrentEvaluationId(id);
                  setSelectedTab(1);
                }}
              />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}

interface EvaluationStatusViewProps {
  evaluationId: string;
  status: EvaluationStatus | null;
  results: {
    summary: EvaluationSummary;
    results: EvaluationResult[];
    metadata: EvaluationMetadata;
    evaluationId: string;
    configPath: string;
    timestamp: string;
    errorClusters?: ErrorClusteringResults;
  } | null;
}

const EvaluationStatusView: React.FC<EvaluationStatusViewProps> = ({
  evaluationId,
  status,
  results
}) => {
  // If we have results, show them immediately (evaluation completed)
  if (results) {
    return (
      <div className="space-y-6">
        {/* Status Card */}
        <Card title="Evaluation Status">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusBadge status="completed" />
              <span className="text-gray-900 font-medium">
                Evaluation {evaluationId.slice(0, 8)}...
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 text-sm font-medium">Evaluation Completed</p>
            <p className="text-green-700 text-sm mt-1">
              Results are ready for review below.
            </p>
          </div>
        </Card>

        {/* Results */}
        <EvaluationResults
          summary={results.summary}
          results={results.results}
          metadata={results.metadata}
          evaluationId={evaluationId}
          errorClusters={results.errorClusters}
        />
      </div>
    );
  }

  // Fallback to status loading/polling
  if (!status) {
    return (
      <Card className="text-center py-8">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 mt-4">Loading evaluation status...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card title="Evaluation Status">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusBadge status={status.status} />
            <span className="text-gray-900 font-medium">
              Evaluation {evaluationId.slice(0, 8)}...
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {status.progress && (
              <span>Progress: {status.progress.completed}/{status.progress.total}</span>
            )}
          </div>
        </div>

        {status.status === 'running' && status.progress && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(status.progress.completed / status.progress.total) * 100}%`
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {status.message || 'Running evaluation...'}
            </p>
          </div>
        )}

        {status.status === 'failed' && status.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-sm font-medium">Error</p>
            <p className="text-red-700 text-sm mt-1">{status.error}</p>
          </div>
        )}

        {status.status === 'completed' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 text-sm font-medium">Evaluation Completed</p>
            <p className="text-green-700 text-sm mt-1">
              Results are ready for review below.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

interface EvaluationHistoryProps {
  evaluations: Array<{
    id: string;
    filename?: string;
    createdAt: string;
    modifiedAt?: string;
    size?: number;
  }>;
  onSelectEvaluation: (id: string) => void;
}

const EvaluationHistory: React.FC<EvaluationHistoryProps> = ({
  evaluations,
  onSelectEvaluation
}) => {
  if (evaluations.length === 0) {
    return (
      <Card className="text-center py-12">
        <div className="text-gray-500">
          <div className="text-lg font-medium mb-2">No Evaluations Yet</div>
          <p>Your evaluation history will appear here once you run evaluations.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {evaluations.map((evaluation) => (
        <div
          key={evaluation.id}
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => onSelectEvaluation(evaluation.id)}
        >
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <div>
                  <p className="font-medium text-gray-900">
                    Evaluation {evaluation.id.slice(0, 8)}...
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(evaluation.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="text-right text-sm text-gray-600">
                {evaluation.filename && (
                  <p className="font-mono">{evaluation.filename}</p>
                )}
                {evaluation.size && (
                  <p>{(evaluation.size / 1024).toFixed(1)} KB</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
};

interface StatusBadgeProps {
  status: EvaluationStatus['status'] | undefined;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </span>
  );
};
