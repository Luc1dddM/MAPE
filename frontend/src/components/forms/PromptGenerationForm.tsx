import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui';
import { TechniqueType, TechniqueParameters } from '@/types/api';

interface PromptGenerationFormData {
  query: string;
  context: string;
  expectedOutput: string;
  techniques: TechniqueType[];
  parameters: TechniqueParameters;
}

interface PromptGenerationFormProps {
  onSubmit: (data: PromptGenerationFormData) => void;
  loading?: boolean;
  availableTechniques?: Array<{ name: string; description: string }>;
}

export const PromptGenerationForm: React.FC<PromptGenerationFormProps> = ({
  onSubmit,
  loading = false,
  availableTechniques = [],
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PromptGenerationFormData>({
    defaultValues: {
      techniques: ['few-shot', 'chain-of-thought', 'zero-shot'],
      parameters: {},
    },
  });

  const selectedTechniques = watch('techniques') || [];

  const handleTechniqueChange = (technique: TechniqueType, checked: boolean) => {
    const current = selectedTechniques;
    if (checked) {
      setValue('techniques', [...current, technique]);
    } else {
      setValue('techniques', current.filter(t => t !== technique));
    }
  };

  return (
    <Card title="Generate Prompts" description="Input your requirements to generate optimized prompts using various techniques">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Query Input */}
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
            Query / Task Description *
          </label>
          <textarea
            id="query"
            rows={3}
            className="textarea"
            placeholder="Describe the task you want the AI to perform..."
            {...register('query', { 
              required: 'Query is required',
              minLength: { value: 10, message: 'Query must be at least 10 characters' },
              maxLength: { value: 8000, message: 'Query must not exceed 8000 characters' }
            })}
          />
          {errors.query && (
            <p className="mt-1 text-sm text-error-600">{errors.query.message}</p>
          )}
        </div>

        {/* Context Input */}
        <div>
          <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
            Context (Optional)
          </label>
          <textarea
            id="context"
            rows={3}
            className="textarea"
            placeholder="Provide additional context that might be helpful..."
            {...register('context', {
              maxLength: { value: 2000, message: 'Context must not exceed 2000 characters' }
            })}
          />
          {errors.context && (
            <p className="mt-1 text-sm text-error-600">{errors.context.message}</p>
          )}
        </div>

        {/* Expected Output Input */}
        <div>
          <label htmlFor="expectedOutput" className="block text-sm font-medium text-gray-700 mb-2">
            Expected Output Format *
          </label>
          <textarea
            id="expectedOutput"
            rows={3}
            className="textarea"
            placeholder="Describe the format and style of the expected output..."
            {...register('expectedOutput', { 
              required: 'Expected output is required',
              minLength: { value: 5, message: 'Expected output must be at least 5 characters' },
              maxLength: { value: 8000, message: 'Expected output must not exceed 8000 characters' }
            })}
          />
          {errors.expectedOutput && (
            <p className="mt-1 text-sm text-error-600">{errors.expectedOutput.message}</p>
          )}
        </div>

        {/* Technique Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Prompt Techniques
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableTechniques.map((technique) => (
              <div key={technique.name} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id={technique.name}
                  checked={selectedTechniques.includes(technique.name as TechniqueType)}
                  onChange={(e) => handleTechniqueChange(technique.name as TechniqueType, e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <label htmlFor={technique.name} className="text-sm font-medium text-gray-700 cursor-pointer">
                    {technique.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">{technique.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Parameters */}
        {selectedTechniques.includes('few-shot') && (
          <div>
            <label htmlFor="fewShotExamples" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Examples (Few-Shot)
            </label>
            <input
              type="number"
              id="fewShotExamples"
              min="1"
              max="10"
              defaultValue="3"
              className="input w-32"
              {...register('parameters.few-shot.numExamples', { valueAsNumber: true })}
            />
          </div>
        )}

        {selectedTechniques.includes('chain-of-thought') && (
          <div>
            <label htmlFor="reasoningSteps" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Reasoning Steps
            </label>
            <input
              type="number"
              id="reasoningSteps"
              min="1"
              max="10"
              defaultValue="3"
              className="input w-32"
              {...register('parameters.chain-of-thought.reasoningSteps', { valueAsNumber: true })}
            />
          </div>
        )}

        {selectedTechniques.includes('role-based') && (
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role/Persona
            </label>
            <input
              type="text"
              id="role"
              placeholder="e.g., expert, teacher, analyst"
              className="input"
              {...register('parameters.role-based.role')}
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={loading}
            disabled={selectedTechniques.length === 0}
          >
            Generate Prompts
          </Button>
        </div>
      </form>
    </Card>
  );
};
