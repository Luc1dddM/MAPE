import React from "react";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-center mb-6">
      {steps.map((step, idx) => (
        <div key={step} className="flex items-center">
          <div
            className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-white ${
              idx <= currentStep ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            {idx + 1}
          </div>
          <span
            className={`ml-2 mr-4 text-sm ${
              idx === currentStep ? "font-bold text-blue-600" : "text-gray-500"
            }`}
          >
            {step}
          </span>
          {idx < steps.length - 1 && (
            <div className="w-8 h-1 bg-gray-300 mx-2 rounded" />
          )}
        </div>
      ))}
    </div>
  );
};

export default Stepper;
