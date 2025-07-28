import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PromptGenerationForm } from '@/components/forms/PromptGenerationForm';
import { Card, Badge, CopyButton, LoadingSpinner } from '@/components/ui';
import { promptService } from '@/services/api';
import { PromptGenerationRequest, PromptResult } from '@/types/api';

const HomePage: React.FC = () => {
  // Fetch available techniques
  const { data: techniquesData, isLoading: techniquesLoading, error: techniquesError } = useQuery({
    queryKey: ['techniques'],
    queryFn: promptService.getTechniques,
  });

  // Generate prompts mutation
  const generatePromptsMutation = useMutation({
    mutationFn: promptService.generatePrompts,
    onSuccess: (data) => {
      const successCount = Object.values(data.data.results).filter((r: any) => r.success).length;
      toast.success(`Successfully generated ${successCount} prompts!`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate prompts: ${error.message}`);
    },
  });

  // Handle techniques loading error
  React.useEffect(() => {
    if (techniquesError) {
      toast.error(`Failed to load techniques: ${techniquesError.message}`);
    }
  }, [techniquesError]);

  const handleFormSubmit = (data: PromptGenerationRequest) => {
    generatePromptsMutation.mutate(data);
  };

  const results = generatePromptsMutation.data?.data.results || {};
  const hasResults = Object.keys(results).length > 0;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Automatic Prompt Engineer
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Generate optimized prompts using various techniques like few-shot learning, 
          chain of thought, and more. Transform your queries into effective AI prompts.
        </p>
      </div>

      {/* Generation Form */}
      <div className="max-w-4xl mx-auto">
        <PromptGenerationForm
          onSubmit={handleFormSubmit}
          loading={generatePromptsMutation.isPending}
          availableTechniques={techniquesData?.data.techniques || []}
        />
      </div>

      {/* Loading State */}
      {generatePromptsMutation.isPending && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Generating optimized prompts...</p>
          </div>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Generated Prompts</h2>
            {generatePromptsMutation.data && (
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>
                  {generatePromptsMutation.data.data.summary.successfulTechniques} of{' '}
                  {generatePromptsMutation.data.data.summary.totalTechniques} techniques successful
                </span>
                <span>•</span>
                <span>
                  Generated at {new Date(generatePromptsMutation.data.data.summary.generatedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {Object.entries(results).map(([technique, result]) => (
              <PromptResultCard
                key={technique}
                technique={technique}
                result={result}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface PromptResultCardProps {
  technique: string;
  result: PromptResult;
}

const PromptResultCard: React.FC<PromptResultCardProps> = ({ technique, result }) => {
  const techniqueDisplayName = technique
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  if (!result.success) {
    return (
      <Card className="border-error-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">{techniqueDisplayName}</h3>
          <Badge variant="error">Failed</Badge>
        </div>
        <p className="text-sm text-error-600">{result.error}</p>
      </Card>
    );
  }

  return (
    <Card className="border-success-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900">{techniqueDisplayName}</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="success">Success</Badge>
          <CopyButton text={result.prompt || ''} />
        </div>
      </div>
      
      {result.description && (
        <p className="text-sm text-gray-600 mb-3">{result.description}</p>
      )}
      
      <div className="bg-gray-50 rounded-lg p-4 mb-3">
        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
          {result.prompt}
        </pre>
      </div>
      
      {result.usage && (
        <div className="text-xs text-gray-500 border-t pt-3">
          <strong>Usage:</strong> {result.usage}
        </div>
      )}
    </Card>
  );
};

export default HomePage;
