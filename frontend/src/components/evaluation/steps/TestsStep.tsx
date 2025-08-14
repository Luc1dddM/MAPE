import React from "react";
import { Card } from "@/components/ui";
import { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import Papa from "papaparse";

interface TestsStepProps {
  form: UseFormReturn<any>;
  testFields: any[];
  appendTest: (value: any) => void;
  removeTest: (index: number) => void;
  errors: any;
}

const TestsStep: React.FC<TestsStepProps> = ({
  form,
  testFields,
  appendTest,
  removeTest,
  errors,
}) => {
  const { register, watch } = form;
  const [inputMode, setInputMode] = useState<"manual" | "csv">("manual");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvUploadError, setCsvUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Download CSV template
  const handleDownloadTemplate = () => {
    const header = "query,expectedAnswer\n";
    const example = "Đây là input ví dụ,Đây là output mong đợi\n";
    const csvContent = header + example;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "testcases_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle CSV file selection and parsing
  const handleCsvFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setCsvPreview([]);
      setCsvUploadError(null);
      // Clear form csvFile field
      form.setValue("csvFile", undefined);
      return;
    }

    setSelectedFile(file);
    setCsvUploading(true);
    setCsvUploadError(null);

    try {
      // Parse CSV for preview only
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data.map((row: any) => ({
            description: row.description || "",
            input: row.query || row.input || "",
            expected: row.expectedAnswer || row.expected || "",
          }));
          setCsvPreview(parsedData);

          // Set file to form data for later submission
          form.setValue("csvFile", file);
        },
        error: (error) => {
          setCsvUploadError(`CSV parsing error: ${error.message}`);
          setCsvPreview([]);
          setSelectedFile(null);
          form.setValue("csvFile", undefined);
        },
      });
    } catch (error) {
      setCsvUploadError(
        error instanceof Error ? error.message : "Failed to parse CSV"
      );
      setCsvPreview([]);
      setSelectedFile(null);
      form.setValue("csvFile", undefined);
    } finally {
      setCsvUploading(false);
    }
  };

  // Sync CSV data to form when switching to CSV mode
  const syncCsvToForm = () => {
    if (inputMode === "csv" && csvPreview.length > 0) {
      form.setValue("testCases", csvPreview);
    }
  };

  // Validation function for this step
  const isTestStepValid = () => {
    if (inputMode === "manual") {
      // For manual mode, check if at least one test case has input
      const hasValidTestCase = testFields.some((field, index) => {
        const inputValue = watch(`testCases.${index}.input`);
        return inputValue && inputValue.trim().length > 0;
      });
      return hasValidTestCase;
    } else {
      // For CSV mode, check if CSV is selected and parsed successfully
      return csvPreview.length > 0 && selectedFile !== null;
    }
  };

  // Get selected file for EvaluationForm
  const getSelectedFile = () => selectedFile;

  // Export functions to form methods for EvaluationForm to access
  (form as any).isTestStepValid = isTestStepValid;
  (form as any).syncCsvToForm = syncCsvToForm;
  (form as any).getSelectedFile = getSelectedFile;

  // Handle input mode change
  const handleInputModeChange = (mode: "manual" | "csv") => {
    setInputMode(mode);

    // Clear validation errors when switching modes
    form.clearErrors("testCases");
    form.clearErrors("csvFile");

    if (mode === "csv") {
      // When switching to CSV mode, sync existing CSV data
      syncCsvToForm();
    } else {
      // When switching to manual mode, clear CSV data
      setCsvPreview([]);
      setSelectedFile(null);
      setCsvUploadError(null);
      form.setValue("csvFile", undefined);
    }
  };

  return (
    <Card
      title="Test Cases"
      description="Define test inputs and expected outputs"
    >
      {/* Input mode selection */}
      <div className="mb-4 flex gap-6">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="inputMode"
            value="manual"
            checked={inputMode === "manual"}
            onChange={() => handleInputModeChange("manual")}
          />
          Manual
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="inputMode"
            value="csv"
            checked={inputMode === "csv"}
            onChange={() => handleInputModeChange("csv")}
          />
          Import from CSV
        </label>
      </div>

      {/* Manual input mode */}
      {inputMode === "manual" && (
        <div className="space-y-4">
          {testFields.map((field, index) => (
            <div
              key={field.id}
              className="border border-gray-200 rounded-lg p-4"
            >
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
                  {...register(`testCases.${index}.input`, {
                    required:
                      inputMode === "manual" ? "Input is required" : false,
                  })}
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
            onClick={() =>
              appendTest({ input: "", expected: "", description: "" })
            }
            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
          >
            + Add Another Test Case
          </button>
        </div>
      )}

      {/* CSV import mode */}
      {inputMode === "csv" && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              type="button"
              className="px-4 py-2 border border-blue-500 text-blue-600 rounded hover:bg-blue-50"
              onClick={handleDownloadTemplate}
            >
              Download CSV Template
            </button>
          </div>

          {/* Status indicators */}
          {csvUploading && (
            <div className="text-blue-600">Đang parse CSV...</div>
          )}
          {csvUploadError && (
            <div className="text-red-600">{csvUploadError}</div>
          )}
          {selectedFile && !csvUploading && !csvUploadError && (
            <div className="text-green-600">
              ✓ CSV đã chọn: {selectedFile.name}
            </div>
          )}

          {/* CSV Preview */}
          {csvPreview.length > 0 && (
            <div className="mt-4">
              <div className="font-semibold mb-2">
                Preview test cases từ CSV ({csvPreview.length} test cases):
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border px-2 py-1 text-left">Query</th>
                      <th className="border px-2 py-1 text-left">
                        ExpectedAnswer
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        <td className="border px-2 py-1 max-w-xs truncate">
                          {row.input}
                        </td>
                        <td className="border px-2 py-1 max-w-xs truncate">
                          {row.expected || "-"}
                        </td>
                      </tr>
                    ))}
                    {csvPreview.length > 5 && (
                      <tr>
                        <td
                          className="border px-2 py-1 text-center text-gray-500"
                          colSpan={3}
                        >
                          ... và {csvPreview.length - 5} test cases khác
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation message */}
      {inputMode === "manual" && testFields.length === 0 && (
        <p className="text-red-600 text-sm mt-2">
          Please add at least one test case or switch to importing a CSV file.
        </p>
      )}
      {inputMode === "csv" && csvPreview.length === 0 && (
        <p className="text-red-600 text-sm mt-2">
          Please select a valid CSV file or switch to manual entry.
        </p>
      )}
    </Card>
  );
};

export default TestsStep;
