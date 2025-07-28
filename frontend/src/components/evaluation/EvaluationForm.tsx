import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card, Badge } from '@/components/ui';
import { evaluationService } from '@/services/api';
import { 
  PromptfooEvaluationRequest, 
  EvaluationCriteria, 
  Provider, 
  TestCase 
} from '@/types/api';

// Form data interface
interface EvaluationFormData {
  name: string;
  description: string;
  prompts: Array<{
    content: string;
    name: string;
  }>;
  testCases: Array<{
    input: string;
    expected?: string;
    description?: string;
  }>;
  providers: Array<{
    id: string;
    name: string;
  }>;
  evaluationCriteria: Array<{
    name: string;
    description: string;
  }>;
  additionalConfig?: {
    timeout?: number;
    maxConcurrency?: number;
    outputPath?: string;
  };
}

interface EvaluationFormProps {
  onEvaluationStart: (evaluationId: string) => void;
}

export const EvaluationForm: React.FC<EvaluationFormProps> = ({ onEvaluationStart }) => {
  const [activeTab, setActiveTab] = useState<'prompts' | 'tests' | 'config'>('prompts');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available providers
  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: () => evaluationService.getProviders(),
  });

  // Fetch available criteria
  const { data: criteriaData } = useQuery({
    queryKey: ['criteria'], 
    queryFn: () => evaluationService.getCriteria(),
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EvaluationFormData>({
    defaultValues: {
      name: '',
      description: '',
      prompts: [{ content: '', name: '' }],
      testCases: [{ input: '', expected: '', description: '' }],
      providers: providersData?.data.providers.map((provider: any) => ({
        id: provider.id,
        name: provider.name || provider.id,
      })) || [],
      evaluationCriteria: criteriaData?.data.criteria.map((criteria: any) => ({
        name: criteria.name,
        description: criteria.description,
      })) || [],
      additionalConfig: {
        timeout: 30000,
        maxConcurrency: 5,
        outputPath: './evaluation-results',
      },
    },
  });

  const { fields: promptFields, append: appendPrompt, remove: removePrompt } = useFieldArray({
    control,
    name: 'prompts',
  });

  const { fields: testFields, append: appendTest, remove: removeTest } = useFieldArray({
    control,
    name: 'testCases',
  });

  // Set default values when data loads
  React.useEffect(() => {
    if (providersData?.data.providers) {
      setValue('providers', providersData.data.providers.map((provider: any) => ({
        id: provider.id,
        name: provider.name || provider.id,
      })));
    }
  }, [providersData, setValue]);

  React.useEffect(() => {
    if (criteriaData?.data.criteria) {
      setValue('evaluationCriteria', criteriaData.data.criteria.map((criteria: any) => ({
        name: criteria.name,
        description: criteria.description,
      })));
    }
  }, [criteriaData, setValue]);

  const onSubmit = async (data: EvaluationFormData) => {
    setIsSubmitting(true);
    try {
      const request: PromptfooEvaluationRequest = {
        name: data.name,
        description: data.description,
        prompts: data.prompts.map(p => p.content),
        testCases: data.testCases.map(tc => ({
          input: tc.input,
          expected: tc.expected,
          description: tc.description,
        })),
        providers: data.providers.map(p => p.id),
        evaluationCriteria: data.evaluationCriteria.map(ec => ec.name),
        additionalConfig: data.additionalConfig,
      };

      const response = await evaluationService.runEvaluation(request);
      
      if (response.success && response.data.evaluationId) {
        onEvaluationStart(response.data.evaluationId);
      }
    } catch (error) {
      console.error('Failed to start evaluation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'prompts', label: 'Prompts', count: promptFields.length },
    { id: 'tests', label: 'Test Cases', count: testFields.length },
    { id: 'config', label: 'Configuration', count: 0 },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <Card title="Create New Evaluation" description="Set up a comprehensive prompt evaluation with multiple techniques and test cases">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evaluation Name
            </label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Customer Service Prompts v1"
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              {...register('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the evaluation purpose"
            />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <Badge className="ml-2" variant="primary">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'prompts' && (
        <Card title="Prompts" description="Add the prompts you want to evaluate">
          <div className="space-y-4">
            {promptFields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Prompt {index + 1}
                  </h4>
                  {promptFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePrompt(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <input
                    {...register(`prompts.${index}.name`, { required: 'Name is required' })}
                    placeholder="Prompt name"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <textarea
                  {...register(`prompts.${index}.content`, { required: 'Content is required' })}
                  placeholder="Enter your prompt here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {errors.prompts?.[index] && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.prompts[index]?.content?.message || errors.prompts[index]?.name?.message}
                  </p>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={() => appendPrompt({ content: '', name: '' })}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
            >
              + Add Another Prompt
            </button>
          </div>
        </Card>
      )}

      {activeTab === 'tests' && (
        <Card title="Test Cases" description="Define test inputs and expected outputs">
          <div className="space-y-4">
            {testFields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Test Case {index + 1}
                  </h4>
                  {testFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTest(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <input
                    {...register(`testCases.${index}.description`)}
                    placeholder="Test description (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <textarea
                    {...register(`testCases.${index}.input`, { required: 'Input is required' })}
                    placeholder="Test input..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <textarea
                    {...register(`testCases.${index}.expected`)}
                    placeholder="Expected output (optional)..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {errors.testCases?.[index]?.input && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.testCases[index]?.input?.message}
                  </p>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={() => appendTest({ input: '', expected: '', description: '' })}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
            >
              + Add Another Test Case
            </button>
          </div>
        </Card>
      )}

      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Providers Selection */}
          <Card title="AI Providers" description="Select the AI models to evaluate against">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {providersData?.data.providers.map((provider: any, index: number) => (
                <label key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    {...register(`providers.${index}`)}
                    type="checkbox"
                    defaultChecked
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {provider.name || provider.id}
                    </p>
                    {provider.description && (
                      <p className="text-xs text-gray-600">{provider.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Evaluation Criteria */}
          <Card title="Evaluation Criteria" description="Choose what aspects to evaluate">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {criteriaData?.data.criteria.map((criteria: any, index: number) => (
                <label key={index} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    {...register(`evaluationCriteria.${index}`)}
                    type="checkbox"
                    defaultChecked
                    className="form-checkbox h-4 w-4 text-blue-600 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{criteria.name}</p>
                    <p className="text-xs text-gray-600">{criteria.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Additional Configuration */}
          <Card title="Advanced Settings" description="Optional configuration for the evaluation">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout (ms)
                </label>
                <input
                  {...register('additionalConfig.timeout')}
                  type="number"
                  defaultValue={30000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Concurrency
                </label>
                <input
                  {...register('additionalConfig.maxConcurrency')}
                  type="number"
                  defaultValue={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Output Path
                </label>
                <input
                  {...register('additionalConfig.outputPath')}
                  defaultValue="./evaluation-results"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
          className="px-6 py-2"
        >
          {isSubmitting ? 'Starting Evaluation...' : 'Start Evaluation'}
        </Button>
      </div>
    </form>
  );
};
