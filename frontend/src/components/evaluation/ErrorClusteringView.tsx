import React, { useState } from 'react';
import { ErrorClusteringResults, ErrorCluster } from '../../types/api';
import { ChevronDownIcon, ChevronRightIcon, ExclamationTriangleIcon, LightBulbIcon } from '@heroicons/react/24/outline';

interface ErrorClusteringViewProps {
  clusteringResults: ErrorClusteringResults;
}

const ErrorClusteringView: React.FC<ErrorClusteringViewProps> = ({ clusteringResults }) => {
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(new Set());
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const toggleCluster = (clusterId: number) => {
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

  const getClusterColor = (clusterId: number) => {
    const colors = [
      'bg-red-50 border-red-200',
      'bg-yellow-50 border-yellow-200', 
      'bg-blue-50 border-blue-200',
      'bg-purple-50 border-purple-200',
      'bg-green-50 border-green-200'
    ];
    return colors[clusterId % colors.length];
  };

  const getClusterIconColor = (clusterId: number) => {
    const colors = [
      'text-red-500',
      'text-yellow-500',
      'text-blue-500', 
      'text-purple-500',
      'text-green-500'
    ];
    return colors[clusterId % colors.length];
  };

  if (!clusteringResults.clusters || clusteringResults.clusters.length === 0) {
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
          <div className="text-sm text-gray-500">
            Analyzed at {new Date(clusteringResults.summary.analysisTime).toLocaleString()}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {clusteringResults.summary.totalFailed}
            </div>
            <div className="text-sm text-gray-600">Failed Tests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {clusteringResults.summary.clustersFound}
            </div>
            <div className="text-sm text-gray-600">Error Patterns</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {clusteringResults.summary.avgClusterSize?.toFixed(1) || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Avg Cluster Size</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {clusteringResults.clusters.reduce((acc, cluster) => acc + cluster.avgSimilarity, 0) / clusteringResults.clusters.length || 0}%
            </div>
            <div className="text-sm text-gray-600">Avg Similarity</div>
          </div>
        </div>

        {clusteringResults.insights && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <LightBulbIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">AI Insights</h4>
                <p className="text-sm text-blue-800">{clusteringResults.insights}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Clusters */}
      <div className="space-y-4">
        {clusteringResults.clusters.map((cluster) => (
          <div key={cluster.id} className={`border rounded-lg ${getClusterColor(cluster.id)}`}>
            {/* Cluster Header */}
            <div 
              className="p-4 cursor-pointer hover:bg-opacity-50 transition-colors"
              onClick={() => toggleCluster(cluster.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {expandedClusters.has(cluster.id) ? (
                    <ChevronDownIcon className={`h-5 w-5 ${getClusterIconColor(cluster.id)}`} />
                  ) : (
                    <ChevronRightIcon className={`h-5 w-5 ${getClusterIconColor(cluster.id)}`} />
                  )}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {cluster.category.name}
                    </h4>
                    <p className="text-sm text-gray-600">{cluster.category.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{cluster.size}</div>
                    <div className="text-xs text-gray-500">tests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{(cluster.avgSimilarity * 100).toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">similarity</div>
                  </div>
                </div>
              </div>

              {/* Representative Error */}
              <div className="mt-3">
                <div className="text-sm font-medium text-gray-700 mb-1">Representative Error:</div>
                <div className="text-sm text-gray-600 bg-white bg-opacity-50 rounded p-2 font-mono">
                  {typeof cluster.representativeError === 'string' 
                    ? cluster.representativeError 
                    : JSON.stringify(cluster.representativeError)}
                </div>
              </div>
            </div>

            {/* Expanded Cluster Content */}
            {expandedClusters.has(cluster.id) && (
              <div className="border-t border-gray-200 bg-white bg-opacity-30">
                {/* Common Patterns */}
                {cluster.category.commonPatterns.length > 0 && (
                  <div className="p-4 border-b border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">Common Patterns:</h5>
                    <ul className="space-y-1">
                      {cluster.category.commonPatterns.map((pattern, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <span className="text-gray-400 mr-2">•</span>
                          {typeof pattern === 'string' ? pattern : JSON.stringify(pattern)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {cluster.category.suggestions.length > 0 && (
                  <div className="p-4 border-b border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">Improvement Suggestions:</h5>
                    <ul className="space-y-1">
                      {cluster.category.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          {typeof suggestion === 'string' ? suggestion : JSON.stringify(suggestion)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Failed Tests in Cluster */}
                <div className="p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">
                    Failed Tests ({cluster.tests.length})
                  </h5>
                  <div className="space-y-3">
                    {cluster.tests.map((test) => (
                      <div key={test.id} className="border border-gray-200 rounded-md bg-white">
                        <div 
                          className="p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleTest(test.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {expandedTests.has(test.id) ? (
                                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                              )}
                              <span className="text-sm font-medium text-gray-900">
                                Test #{test.id}
                              </span>
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                Failed
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Similarity: {(test.similarity * 100).toFixed(0)}%
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-600 truncate">
                            {typeof test.errorText === 'string' 
                              ? test.errorText 
                              : JSON.stringify(test.errorText)}
                          </div>
                        </div>

                        {/* Expanded Test Details */}
                        {expandedTests.has(test.id) && (
                          <div className="border-t border-gray-200 p-3 bg-gray-50 space-y-3">
                            <div>
                              <div className="text-xs font-semibold text-gray-700 mb-1">Error:</div>
                              <div className="text-xs text-red-600 bg-red-50 p-2 rounded font-mono">
                                {typeof (test.error || test.errorText) === 'string' 
                                  ? (test.error || test.errorText) 
                                  : JSON.stringify(test.error || test.errorText)}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-xs font-semibold text-gray-700 mb-1">Prompt:</div>
                              <div className="text-xs text-gray-600 bg-white p-2 rounded max-h-20 overflow-y-auto">
                                {typeof test.prompt === 'string' ? test.prompt : JSON.stringify(test.prompt)}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-xs font-semibold text-gray-700 mb-1">Response:</div>
                              <div className="text-xs text-gray-600 bg-white p-2 rounded max-h-20 overflow-y-auto">
                                {typeof test.response === 'string' 
                                  ? (test.response || 'No response') 
                                  : JSON.stringify(test.response) || 'No response'}
                              </div>
                            </div>

                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Score: {test.score}</span>
                              <span>Latency: {test.latencyMs}ms</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
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

export default ErrorClusteringView;
