import React from "react";
import { Card } from "@/components/ui";
import { UseFormReturn } from "react-hook-form";

interface PromptsStepProps {
  form: UseFormReturn<any>;
  promptFields: any[];
  appendPrompt: (value: any) => void;
  removePrompt: (index: number) => void;
  errors: any;
}

const PromptsStep: React.FC<PromptsStepProps> = ({
  form,
  promptFields,
  appendPrompt,
  removePrompt,
  errors,
}) => {
  const { register } = form;
  return (
    <Card title="Prompts" description="Add the prompts you want to evaluate">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evaluation Name
            </label>
            <input
              {...register("name", { required: "Name is required" })}
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
              {...register("description")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the evaluation purpose"
            />
          </div>
        </div>
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
                {...register(`prompts.${index}.name`, {
                  required: "Name is required",
                })}
                placeholder="Prompt name"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <textarea
              {...register(`prompts.${index}.content`, {
                required: "Content is required",
              })}
              placeholder="Enter your prompt here..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.prompts?.[index] && (
              <p className="text-red-600 text-sm mt-1">
                {errors.prompts[index]?.content?.message ||
                  errors.prompts[index]?.name?.message}
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => appendPrompt({ content: "", name: "" })}
          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
        >
          + Add Another Prompt
        </button>
      </div>
    </Card>
  );
};

export default PromptsStep;
