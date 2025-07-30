import React from "react";
import { Card } from "@/components/ui";
import { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import Papa from "papaparse";
import { uploadEvaluationCsv } from "@/services/api";
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
  const { register } = form;
  const [inputMode, setInputMode] = useState<"manual" | "csv">("manual");
  // CSV preview state (sẽ dùng sau)
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [uploadedCsvPath, setUploadedCsvPath] = useState<string | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvUploadError, setCsvUploadError] = useState<string | null>(null);

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

  // Hàm đồng bộ testCases từ csvPreview vào form
  const syncCsvToForm = () => {
    if (inputMode === "csv" && csvPreview.length > 0) {
      form.setValue("testCases", csvPreview);
    }
  };

  // Hàm kiểm tra hợp lệ cho step này
  const isTestStepValid = () => {
    const hasManual =
      testFields.length > 0 && testFields.some((f) => f.input || f.query);
    const hasCsv = csvPreview.length > 0;
    return hasManual || hasCsv;
  };
  (form as any).isTestStepValid = isTestStepValid;

  // Export hàm syncCsvToForm để EvaluationForm gọi được
  (form as any).syncCsvToForm = syncCsvToForm;

  // Hàm lấy testDataFile cho EvaluationForm
  const getTestDataFile = () => uploadedCsvPath;
  (form as any).getTestDataFile = getTestDataFile;

  return (
    <Card
      title="Test Cases"
      description="Define test inputs and expected outputs"
    >
      {/* Chọn mode nhập */}
      <div className="mb-4 flex gap-6">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="inputMode"
            value="manual"
            checked={inputMode === "manual"}
            onChange={() => setInputMode("manual")}
          />
          Nhập tay
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="inputMode"
            value="csv"
            checked={inputMode === "csv"}
            onChange={() => setInputMode("csv")}
          />
          Import từ CSV
        </label>
      </div>

      {/* Nếu chọn nhập tay, giữ nguyên UI cũ */}
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
                    required: "Input is required",
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

      {/* Nếu chọn import CSV, hiển thị UI upload và preview (chưa xử lý logic) */}
      {inputMode === "csv" && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <input
              {...register("csvFile")}
              type="file"
              accept=".csv"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              type="button"
              className="px-4 py-2 border border-blue-500 text-blue-600 rounded hover:bg-blue-50"
              onClick={handleDownloadTemplate}
            >
              Download CSV Template
            </button>
            {csvUploading && (
              <span className="text-blue-600 ml-2">Đang upload...</span>
            )}
            {csvUploadError && (
              <span className="text-red-600 ml-2">{csvUploadError}</span>
            )}
            {uploadedCsvPath && !csvUploading && (
              <span className="text-green-600 ml-2">Đã upload!</span>
            )}
          </div>
          {/* Preview test cases từ CSV (sẽ xử lý sau) */}
          {csvPreview.length > 0 && (
            <div className="mt-4">
              <div className="font-semibold mb-2">
                Preview test cases từ CSV:
              </div>
              <table className="min-w-full border text-sm">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Description</th>
                    <th className="border px-2 py-1">Input</th>
                    <th className="border px-2 py-1">Expected</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1">{row.description}</td>
                      <td className="border px-2 py-1">{row.input}</td>
                      <td className="border px-2 py-1">{row.expected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default TestsStep;
