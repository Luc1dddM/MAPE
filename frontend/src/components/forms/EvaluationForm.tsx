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

interface EvaluationFormData {
  description: string;
  prompts: { content: string }[];
  testCases: TestCase[];
  providers: { selected: boolean; provider: Provider }[];
  evaluationCriteria: { selected: boolean; criteria: EvaluationCriteria }[];
}

interface EvaluationFormProps {
  onSubmit: (data: PromptfooEvaluationRequest) => void;
  loading?: boolean;
  initialPrompts?: string[];
}

export const EvaluationForm: React.FC<EvaluationFormProps> = ({
  onSubmit,
  loading = false,
  initialPrompts = []
}) => {
  const [activeTab, setActiveTab] = useState<'prompts' | 'tests' | 'config'>('prompts');

  // Fetch available criteria and providers
  const { data: criteriaData } = useQuery({
    queryKey: ['evaluation-criteria'],
    queryFn: evaluationService.getCriteria
  });
  const { data: providersData } = useQuery({
    queryKey: ['evaluation-providers'],
    queryFn: evaluationService.getProviders
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm<EvaluationFormData>({
    defaultValues: {
      description: '',
      prompts: initialPrompts.length > 0 
        ? initialPrompts.map(content => ({ content }))
        : [{ content: '' }],
      testCases: [{ description: '', input: '', expectedOutput: '' }],
      providers: providersData?.data.providers.map(provider => ({
        selected: provider.id === 'google:gemini-1.5-flash',
        provider
      })) || [],
      evaluationCriteria: criteriaData?.data.criteria.map(criteria => ({
        selected: criteria.enabled,
        criteria
      })) || []
    }
  });

  const { fields: promptFields, append: appendPrompt, remove: removePrompt } = useFieldArray({
    control,
    name: 'prompts'
  });

  const { fields: testFields, append: appendTest, remove: removeTest } = useFieldArray({
    control,
    name: 'testCases'
  });

  React.useEffect(() => {
    if (providersData?.data.providers) {
      setValue('providers', providersData.data.providers.map(provider => ({
        selected: provider.id === 'google:gemini-2.5-flash-lite',
        provider
      })));
    }
  }, [providersData, setValue]);

  React.useEffect(() => {
    if (criteriaData?.data.criteria) {
      setValue('evaluationCriteria', criteriaData.data.criteria.map(criteria => ({
        selected: criteria.enabled,
        criteria
      })));
    }
  }, [criteriaData, setValue]);

  const handleFormSubmit = (data: EvaluationFormData) => {
    const evaluationRequest: PromptfooEvaluationRequest = {
      description: data.description || 'MAPE Evaluation',
      prompts: data.prompts.map(p => p.content).filter(content => content.trim()),
      testCases: data.testCases.filter(tc => tc.description.trim()),
      providers: data.providers.filter(p => p.selected).map(p => p.provider),
      evaluationCriteria: data.evaluationCriteria.filter(c => c.selected).map(c => c.criteria)
    };

    onSubmit(evaluationRequest);
  };

  const watchedProviders = watch('providers') || [];
  const watchedCriteria = watch('evaluationCriteria') || [];

  return (
    <Card title="Evaluate Prompts" description="Set up comprehensive evaluation using various criteria and test cases">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Evaluation Description
          </label>
          <input
            type="text"
            id="description"
            placeholder="Describe what you're evaluating..."
            className="input"
            {...register('description')}
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'prompts', label: 'Prompts', count: promptFields.length },
              { id: 'tests', label: 'Test Cases', count: testFields.length },
              { id: 'config', label: 'Configuration', count: watchedProviders.filter(p => p.selected).length }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className="ml-2 text-xs bg-gray-100 rounded-full px-2 py-1">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Prompts Tab */}
        {activeTab === 'prompts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Prompts to Evaluate</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendPrompt({ content: '' })}
              >
                Add Prompt
              </Button>
            </div>
            
            {promptFields.map((field, index) => (
              <div key={field.id} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt {index + 1}
                </label>
                <div className="flex space-x-2">
                  <textarea
                    rows={3}
                    className="textarea flex-1"
                    placeholder="Enter your prompt here..."
                    {...register(`prompts.${index}.content`, { 
                      required: 'Prompt is required' 
                    })}
                  />
                  {promptFields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePrompt(index)}
                      className="self-start"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {errors.prompts?.[index]?.content && (
                  <p className="mt-1 text-sm text-error-600">
                    {errors.prompts[index]?.content?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Test Cases Tab */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Test Cases</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendTest({ description: '', input: '', expectedOutput: '' })}
              >
                Add Test Case
              </Button>
            </div>
            
            {testFields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Test Case {index + 1}</h4>
                  {testFields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTest(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Describe this test case..."
                      {...register(`testCases.${index}.description`)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Output
                    </label>
                    <textarea
                      rows={2}
                      className="textarea"
                      placeholder="What output do you expect?"
                      {...register(`testCases.${index}.expectedOutput`)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Providers */}
            <div>
              <h3 className="text-lg font-medium mb-3">AI Providers</h3>
              <div className="space-y-3">
                {providersData?.data.providers.map((provider, index) => (
                  <div key={provider.id} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={`provider-${index}`}
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      {...register(`providers.${index}.selected`)}
                    />
                    <div className="flex-1">
                      <label htmlFor={`provider-${index}`} className="block font-medium text-gray-700">
                        {provider.name || provider.id}
                      </label>
                      {provider.description && (
                        <p className="text-sm text-gray-500">{provider.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evaluation Criteria */}
            <div>
              <h3 className="text-lg font-medium mb-3">Evaluation Criteria</h3>
              <div className="space-y-3">
                {criteriaData?.data.criteria.map((criteria, index) => (
                  <div key={criteria.name} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={`criteria-${index}`}
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      {...register(`evaluationCriteria.${index}.selected`)}
                    />
                    <div className="flex-1">
                      <label htmlFor={`criteria-${index}`} className="block font-medium text-gray-700">
                        {criteria.name.charAt(0).toUpperCase() + criteria.name.slice(1)}
                      </label>
                      <p className="text-sm text-gray-500">{criteria.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            type="submit"
            loading={loading}
            disabled={promptFields.length === 0 || watchedProviders.filter(p => p.selected).length === 0}
          >
            Run Evaluation
          </Button>
        </div>
      </form>
    </Card>
  );
};
