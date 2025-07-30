import React from "react";
import { Card } from "@/components/ui";
import { UseFormReturn } from "react-hook-form";

interface ConfigStepProps {
  form: UseFormReturn<any>;
  providersData: any;
  criteriaData: any;
  errors: any;
}

const ConfigStep: React.FC<ConfigStepProps> = ({
  form,
  providersData,
  criteriaData,
  errors,
}) => {
  const { register, watch, setValue } = form;

  // Get current selected providers
  const selectedProviders = watch("providers") || [];

  // Handle provider checkbox change
  const handleProviderChange = (providerId: string, checked: boolean) => {
    let updatedProviders: string[];

    if (checked) {
      // Add provider ID if not already selected
      updatedProviders = [
        ...selectedProviders.filter((id: string) => id !== providerId),
        providerId,
      ];
    } else {
      // Remove provider ID
      updatedProviders = selectedProviders.filter(
        (id: string) => id !== providerId
      );
    }

    setValue("providers", updatedProviders);
  };

  // Handle criteria checkbox change
  const handleCriteriaChange = (criteriaName: string, checked: boolean) => {
    const selectedCriteria = watch("evaluationCriteria") || [];
    let updatedCriteria: string[];

    if (checked) {
      updatedCriteria = [
        ...selectedCriteria.filter((name: string) => name !== criteriaName),
        criteriaName,
      ];
    } else {
      updatedCriteria = selectedCriteria.filter(
        (name: string) => name !== criteriaName
      );
    }

    setValue("evaluationCriteria", updatedCriteria);
  };

  return (
    <div className="space-y-6">
      <Card
        title="AI Providers"
        description="Select the AI models to evaluate against"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {providersData?.data.providers.map((provider: any, index: number) => (
            <label
              key={index}
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedProviders.includes(provider.id)}
                onChange={(e) =>
                  handleProviderChange(provider.id, e.target.checked)
                }
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {provider.name || provider.id}
                </p>
                {provider.description && (
                  <p className="text-xs text-gray-600">
                    {provider.description}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>
        {errors.providers && (
          <p className="text-red-600 text-sm mt-2">
            {errors.providers.message}
          </p>
        )}
      </Card>

      <Card
        title="Evaluation Criteria"
        description="Choose what aspects to evaluate"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {criteriaData?.data.criteria.map((criteria: any, index: number) => {
            const selectedCriteria = watch("evaluationCriteria") || [];
            return (
              <label
                key={index}
                className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedCriteria.includes(criteria.name)}
                  onChange={(e) =>
                    handleCriteriaChange(criteria.name, e.target.checked)
                  }
                  className="form-checkbox h-4 w-4 text-blue-600 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {criteria.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {criteria.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
        {errors.evaluationCriteria && (
          <p className="text-red-600 text-sm mt-2">
            {errors.evaluationCriteria.message}
          </p>
        )}
      </Card>

      <Card
        title="Advanced Settings"
        description="Optional configuration for the evaluation"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeout (ms)
            </label>
            <input
              {...register("additionalConfig.timeout", {
                valueAsNumber: true,
                validate: (value) =>
                  value > 0 || "Timeout must be greater than 0",
              })}
              type="number"
              defaultValue={30000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.additionalConfig?.timeout && (
              <p className="text-red-600 text-sm mt-1">
                {errors.additionalConfig.timeout.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Concurrency
            </label>
            <input
              {...register("additionalConfig.maxConcurrency", {
                valueAsNumber: true,
                validate: (value) =>
                  value > 0 || "Max concurrency must be greater than 0",
              })}
              type="number"
              defaultValue={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.additionalConfig?.maxConcurrency && (
              <p className="text-red-600 text-sm mt-1">
                {errors.additionalConfig.maxConcurrency.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Output Path
            </label>
            <input
              {...register("additionalConfig.outputPath", {
                required: "Output path is required",
              })}
              defaultValue="./evaluation-results"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.additionalConfig?.outputPath && (
              <p className="text-red-600 text-sm mt-1">
                {errors.additionalConfig.outputPath.message}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ConfigStep;
