import React, { useMemo } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { usePromptStore } from "@/stores/promptStore";
import { useState } from "react";
import toast from "react-hot-toast";

export interface TestCase {
  id: string;
  vars: {
    query: string;
    expectedAnswer: string;
  };
  response: string;
  score: number;
  reason: string;
}

export interface TestCasesDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  testCases: TestCase[];
  categoryName?: string;
  clusterId?: string;
  promptId?: string;
}

const getScoreColor = (score: number): string => {
  if (score >= 7) return "text-green-600";
  if (score >= 5) return "text-yellow-600";
  return "text-red-600";
};

const truncateText = (text: string, maxLength: number = 80): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export const TestCasesDialog: React.FC<TestCasesDialogProps> = ({
  open,
  onClose,
  title,
  testCases,
  categoryName,
  clusterId,
  promptId,
}) => {
  // Prompt store hooks
  const { selectedTestCase, select, deselect, selectAll, deselectAll } =
    usePromptStore();

  // Convert Set to array for easier usage
  const selectedIds = selectedTestCase
    .filter(
      (item) =>
        item.promptId === promptId &&
        item.clusterId === clusterId &&
        testCases.some((test) => test.id === item.testId),
    )
    .map((item) => item.testId);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectAll(
        testCases.map((test) => test.id),
        clusterId ?? "",
        promptId ?? "",
      );
    } else {
      deselectAll(clusterId ?? "", promptId ?? "");
    }
  };

  const handleRowSelect = (test: TestCase, checked: boolean) => {
    if (checked) {
      select(test.id, clusterId ?? "", promptId ?? "");
    } else {
      deselect(test.id);
    }
  };

  const selectedCount = selectedIds.length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {title || "Failed Test Cases"}
            {categoryName ? (
              <span className="ml-2 text-sm text-gray-500 font-normal">
                {categoryName}
              </span>
            ) : null}
            <span className="ml-2 text-xs text-gray-400 font-normal">
              ({testCases.length})
            </span>
            {selectedCount > 0 && (
              <span className="ml-4 text-xs text-blue-600 font-semibold">
                {selectedCount} selected
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 overflow-x-auto overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={
                      testCases.length > 0 &&
                      selectedIds.length === testCases.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  #
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  Query
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  Expected
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  Actual
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  Score
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody>
              {testCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No failed test cases.
                  </td>
                </tr>
              ) : (
                testCases.map((test, idx) => (
                  <tr
                    key={test.id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(test.id)}
                        onChange={(e) =>
                          handleRowSelect(test, e.target.checked)
                        }
                        aria-label={`Select test case ${idx + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                    <td
                      className="px-3 py-2 text-gray-900"
                      title={test.vars.query}
                    >
                      {truncateText(test.vars.query)}
                    </td>
                    <td
                      className="px-3 py-2 text-gray-700"
                      title={test.vars.expectedAnswer}
                    >
                      {truncateText(test.vars.expectedAnswer)}
                    </td>
                    <td
                      className="px-3 py-2 text-gray-700"
                      title={test.response}
                    >
                      {truncateText(test.response)}
                    </td>
                    <td
                      className={`px-3 py-2 font-semibold ${getScoreColor(test.score)}`}
                    >
                      {test.score}/10
                    </td>
                    <td className="px-3 py-2 text-red-600" title={test.reason}>
                      {truncateText(test.reason, 60)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TestCasesDialog;
