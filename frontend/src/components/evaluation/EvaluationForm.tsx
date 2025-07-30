import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui";
import { evaluationService } from "@/services/api";
import {
  PromptfooEvaluationRequest,
  EvaluationCriteria,
  EvaluationSummary,
  EvaluationResult,
  EvaluationMetadata,
  ErrorClusteringResults,
} from "@/types/api";

// Define EvaluationFormData locally to match backend expectations
interface EvaluationFormData {
  name: string;
  description: string;
  prompts: Array<{ content: string; name: string }>;
  testCases?: Array<{ input: string; expected?: string; description?: string }>;
  providers: string[];
  evaluationCriteria: string[];
  additionalConfig?: {
    timeout?: number;
    maxConcurrency?: number;
    outputPath?: string;
  };
  testDataFile?: string;
}
import PromptsStep from "./steps/PromptsStep";
import TestsStep from "./steps/TestsStep";
import ConfigStep from "./steps/ConfigStep";
import Stepper from "./steps/Stepper";
import { useEvaluationStore } from "./useEvaluationStore";
import {
  promptsStepSchema,
  testsStepSchema,
  configStepSchema,
} from "./steps/validation";

// Form data interface
// Use interface from types/api.ts

interface EvaluationFormProps {
  onEvaluationStart: (evaluationData: {
    summary: EvaluationSummary;
    results: EvaluationResult[];
    metadata: EvaluationMetadata;
    evaluationId: string;
    configPath: string;
    timestamp: string;
    errorClusters?: ErrorClusteringResults;
  }) => void;
}

export const EvaluationForm: React.FC<EvaluationFormProps> = ({
  onEvaluationStart,
}) => {
  const steps = ["Prompts", "Test Cases", "Configuration"];
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available providers
  const { data: providersData } = useQuery({
    queryKey: ["providers"],
    queryFn: () => evaluationService.getProviders(),
  });

  // Fetch available criteria
  const { data: criteriaData } = useQuery({
    queryKey: ["criteria"],
    queryFn: () => evaluationService.getCriteria(),
  });

  const formMethods = useForm<EvaluationFormData>({
    defaultValues: {
      name: "",
      description: "",
      prompts: [{ content: "", name: "" }],
      testCases: [{ input: "", expected: "", description: "" }],
      providers: [],
      evaluationCriteria: [],
      additionalConfig: {
        timeout: 30000,
        maxConcurrency: 5,
        outputPath: "./evaluation-results",
      },
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = formMethods;

  const {
    fields: promptFields,
    append: appendPrompt,
    remove: removePrompt,
  } = useFieldArray({
    control,
    name: "prompts",
  });

  const {
    fields: testFields,
    append: appendTest,
    remove: removeTest,
  } = useFieldArray({
    control,
    name: "testCases",
  });

  // Set default values when data loads
  React.useEffect(() => {
    if (providersData?.data.providers) {
      // Set default checked providers as array of provider ids (string[])
      setValue(
        "providers",
        providersData.data.providers.map((provider: any) => provider.id)
      );
    }
  }, [providersData, setValue]);

  React.useEffect(() => {
    if (criteriaData?.data.criteria) {
      setValue(
        "evaluationCriteria",
        criteriaData.data.criteria.map((criteria: any) => criteria.name)
      );
    }
  }, [criteriaData, setValue]);

  const onSubmit = async (data: EvaluationFormData) => {
    let testDataFile: string | null = null;
    if (typeof (formMethods as any).getTestDataFile === "function") {
      testDataFile = (formMethods as any).getTestDataFile();
    }
    if (testDataFile) {
      // Nếu có testDataFile (import CSV), KHÔNG gửi testCases
      data.testDataFile = testDataFile;
      if ("testCases" in data) {
        delete data.testCases;
      }
    } else if (typeof (formMethods as any).syncCsvToForm === "function") {
      // Nếu nhập tay, đồng bộ testCases như cũ
      (formMethods as any).syncCsvToForm();
      data = formMethods.getValues();
    }
    setIsSubmitting(true);
    try {
      // Ensure providers is always an array of strings (provider IDs)
      let selectedProviders: string[] = [];
      if (Array.isArray(data.providers)) {
        selectedProviders = data.providers.filter(
          (p: any) => typeof p === "string" && p.length > 0
        );
      }

      // Normalize criteria
      const selectedCriteriaNames = data.evaluationCriteria || [];
      const selectedCriteria: EvaluationCriteria[] =
        criteriaData?.data.criteria
          .filter((c: any) => selectedCriteriaNames.includes(c.name))
          .map((c: any) => ({
            name: c.name,
            description: c.description,
            enabled: true,
          })) ?? [];

      const request: PromptfooEvaluationRequest = {
        description: data.description,
        prompts: data.prompts.map((p: any) => p.content),
        testCases: (data.testCases ?? []).map((tc: any) => ({
          input: tc.input,
          expected: tc.expected,
          description: tc.description,
        })),
        providers: selectedProviders,
        evaluationCriteria: selectedCriteria,
        // additionalConfig: {
        //   timeout: data.additionalConfig?.timeout || 30000,
        //   maxConcurrency: data.additionalConfig?.maxConcurrency || 5,
        //   outputPath: data.additionalConfig?.outputPath || "./evaluation-results",
        // },
      };

      const response = await evaluationService.runEvaluation(request);

      if (response.success && response.data) {
        toast.success("Evaluation started successfully!");
        onEvaluationStart({
          summary: response.data.summary,
          results: response.data.results,
          metadata: response.data.metadata,
          evaluationId: response.data.evaluationId,
          configPath: response.data.configPath,
          timestamp: response.data.timestamp,
          errorClusters: response.data.errorClusters,
        });
      }
    } catch (error) {
      console.error("Failed to start evaluation:", error);
      toast.error("Failed to start evaluation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to validate current step
  const validateCurrentStep = async () => {
    let stepData = {};
    let schema;
    let fieldsToValidate: (keyof EvaluationFormData)[] = [];

    if (currentStep === 0) {
      stepData = { prompts: watch("prompts") };
      schema = promptsStepSchema;
      fieldsToValidate = ["prompts"];
    } else if (currentStep === 1) {
      // Nếu có hàm isTestStepValid (từ TestsStep), dùng để kiểm tra hợp lệ
      if (typeof (formMethods as any).isTestStepValid === "function") {
        const valid = (formMethods as any).isTestStepValid();
        console.log("valid", valid);
        if (!valid) {
          toast.error(
            "Bạn phải nhập ít nhất 1 test case hoặc import file CSV hợp lệ."
          );
          return false;
        }
        return true;
      }
      stepData = { testCases: watch("testCases") };
      schema = testsStepSchema;
      fieldsToValidate = ["testCases"];
    } else if (currentStep === 2) {
      stepData = {
        providers: watch("providers"),
        evaluationCriteria: watch("evaluationCriteria"),
        additionalConfig: watch("additionalConfig"),
      };
      schema = configStepSchema;
      fieldsToValidate = [
        "providers",
        "evaluationCriteria",
        "additionalConfig",
      ];
    }

    if (!schema) return false;

    // First validate with react-hook-form
    const isFormValid = await trigger(fieldsToValidate);

    // Then validate with zod schema
    const result = schema.safeParse(stepData);

    if (!isFormValid || !result.success) {
      if (!result.success) {
        // Show validation errors as toast
        const errorMessages = result.error.issues.map((issue) => issue.message);
        errorMessages.forEach((message) => {
          toast.error(message);
        });
      }
      return false;
    }

    return true;
  };

  // zustand store
  const { formData, setFormData } = useEvaluationStore();

  return (
    <form className="space-y-6 relative" onSubmit={handleSubmit(onSubmit)}>
      <div className="mt-4">
        <Stepper steps={steps} currentStep={currentStep} />
      </div>
      <Card
        title="Create New Evaluation"
        description="Set up a comprehensive prompt evaluation with multiple techniques and test cases"
      >
        {currentStep === 0 && (
          <PromptsStep
            form={formMethods}
            promptFields={promptFields}
            appendPrompt={appendPrompt}
            removePrompt={removePrompt}
            errors={errors}
          />
        )}
        {currentStep === 1 && (
          <TestsStep
            form={formMethods}
            testFields={testFields}
            appendTest={appendTest}
            removeTest={removeTest}
            errors={formMethods.formState.errors}
          />
        )}
        {currentStep === 2 && (
          <ConfigStep
            form={formMethods}
            providersData={providersData}
            criteriaData={criteriaData}
            errors={formMethods.formState.errors}
          />
        )}
        <div className="flex justify-between space-x-3 mt-6">
          {currentStep > 0 && (
            <Button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-2"
            >
              Back
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button
              type="button"
              className="px-6 py-2"
              onClick={async () => {
                const isValid = await validateCurrentStep();
                console.log("isValid", isValid);
                if (isValid) {
                  let stepData = {};
                  if (currentStep === 0) {
                    stepData = { prompts: watch("prompts") };
                  } else if (currentStep === 1) {
                    stepData = { testCases: watch("testCases") };
                  } else if (currentStep === 2) {
                    stepData = {
                      providers: watch("providers"),
                      evaluationCriteria: watch("evaluationCriteria"),
                      additionalConfig: watch("additionalConfig"),
                    };
                  }
                  setFormData({ ...formData, ...stepData });
                  setCurrentStep(currentStep + 1);
                } else {
                  toast.error("Please fill in all fields");
                }
              }}
            >
              Next
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="px-6 py-2"
            >
              {isSubmitting ? "Starting Evaluation..." : "Start Evaluation"}
            </Button>
          )}
        </div>
      </Card>
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-70 rounded-md">
          <svg
            className="animate-spin h-10 w-10 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            ></path>
          </svg>
          <span className="mt-4 text-lg text-blue-700">Processing...</span>
        </div>
      )}
    </form>
  );
};
