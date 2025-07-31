import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui";
import { evaluationService } from "@/services/api";
import {
  EvaluationSummary,
  EvaluationResult,
  EvaluationMetadata,
  ErrorClusteringResults,
} from "@/types/api";
import PromptsStep from "./steps/PromptsStep";
import TestsStep from "./steps/TestsStep";
import ConfigStep from "./steps/ConfigStep";
import Stepper from "./steps/Stepper";
import {
  evaluationFormSchema,
  type EvaluationFormData as ValidationFormData,
} from "./steps/validation";

// Use the validated form data type from validation schema
type EvaluationFormData = ValidationFormData;

// Props interface
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

  // Initialize form with Zod resolver
  const formMethods = useForm<EvaluationFormData>({
    resolver: zodResolver(evaluationFormSchema),
    mode: "onChange", // Enable real-time validation
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

  // Submit function with CSV file handling
  const onSubmit = async (data: EvaluationFormData) => {
    console.log("SubmitData:", data);
    setIsSubmitting(true);
    try {
      // Get CSV file from form data or TestsStep component
      let fileToUpload: File | null = null;

      // Check if csvFile is set in form data (from react-hook-form)
      if (data.csvFile && data.csvFile instanceof File) {
        fileToUpload = data.csvFile;
      }
      // Fallback to getSelectedFile method
      else if (typeof (formMethods as any).getSelectedFile === "function") {
        fileToUpload = (formMethods as any).getSelectedFile();
      }

      console.log("File to upload:", fileToUpload);

      // Ensure providers is always an array of strings (provider IDs)
      const selectedProviders: string[] = Array.isArray(data.providers)
        ? data.providers.filter(
            (p: any) => typeof p === "string" && p.length > 0
          )
        : [];

      // Normalize criteria to array of strings (just the names)
      const selectedCriteriaNames: string[] = data.evaluationCriteria || [];

      // Prepare test cases - either from manual input or empty array if using CSV
      const testCases: any[] = [];
      if (!fileToUpload && data.testCases) {
        data.testCases.forEach((tc) => {
          if (tc.input && tc.input.trim()) {
            testCases.push({
              description: tc.description || "",
              input: tc.input,
              expected: tc.expected || "",
            });
          }
        });
      }

      // Prepare the request payload
      const requestPayload: any = {
        description: data.description || "",
        prompts: data.prompts.map((p) => p.content),
        ...(testCases.length > 0 && { testCases }),
        ...(selectedProviders.length > 0 && { providers: selectedProviders }),
        ...(selectedCriteriaNames.length > 0 && {
          evaluationCriteria: selectedCriteriaNames,
        }),
      };

      console.log("Request payload:", requestPayload);

      // Create FormData
      const formData = new FormData();

      // Add all data as JSON string
      formData.append("data", JSON.stringify(requestPayload));

      // Add CSV file if exists
      if (fileToUpload) {
        formData.append("testDataFile", fileToUpload);
        console.log("Sending with file:", fileToUpload.name);
      } else {
        console.log("Sending without file");
      }

      // // Debug: Log all FormData entries
      // console.log("FormData entries:");
      // for (let [key, value] of formData.entries()) {
      //   console.log(key, ":", typeof value === "string" ? value : "File");
      // }

      // Always use the file upload endpoint now
      const response = await evaluationService.runEvaluationWithFile(formData);

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
    let fieldsToValidate: (keyof EvaluationFormData)[] = [];

    if (currentStep === 0) {
      // Validate prompts step
      fieldsToValidate = ["prompts"];
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) {
        toast.error("Please fill in all required prompt fields correctly.");
        return false;
      }
    } else if (currentStep === 1) {
      // Validate test cases step using custom logic from TestsStep
      if (typeof (formMethods as any).isTestStepValid === "function") {
        const isValid = (formMethods as any).isTestStepValid();
        if (!isValid) {
          toast.error(
            "Please provide test cases either manually or upload a CSV file."
          );
          return false;
        }

        // Sync CSV data to form if using CSV mode
        if (typeof (formMethods as any).syncCsvToForm === "function") {
          (formMethods as any).syncCsvToForm();
        }
      } else {
        // Fallback validation
        const hasTestCases = watch("testCases")?.some((tc) => tc.input?.trim());
        const hasCSVFile = watch("csvFile");

        if (!hasTestCases && !hasCSVFile) {
          toast.error(
            "Please provide test cases either manually or upload a CSV file."
          );
          return false;
        }
      }
    } else if (currentStep === 2) {
      // Validate configuration step
      fieldsToValidate = [
        "providers",
        "evaluationCriteria",
        "additionalConfig",
      ];
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) {
        toast.error("Please complete all configuration fields correctly.");
        return false;
      }
    }

    return true;
  };

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
                if (isValid) {
                  setCurrentStep(currentStep + 1);
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