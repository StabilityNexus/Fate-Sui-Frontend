"use client";

import React from "react";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}

const StepIndicator = ({
  currentStep,
  totalSteps,
  stepTitles,
}: StepIndicatorProps) => {
  return (
    <div className="w-full mb-8 max-w-full">
      <div className="flex items-center justify-between w-full">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, index) => (
          <React.Fragment key={step}>
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full flex items-center justify-center border-2 transition-all ${step < currentStep
                  ? "bg-green-500 border-green-500 text-white"
                  : step === currentStep
                    ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black"
                    : "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-500"
                }`}
            >
              {step < currentStep ? (
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <span className="text-xs sm:text-sm font-medium">{step}</span>
              )}
            </div>
            {step < totalSteps && (
              <div
                className={`h-1 flex-1 mx-2 sm:mx-4 transition-all min-w-[10px] sm:min-w-[20px] ${step < currentStep
                    ? "bg-green-500"
                    : "bg-neutral-200 dark:bg-neutral-700"
                  }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="flex justify-between mt-3 relative w-full">
        {stepTitles.map((title, index) => {
          let alignClass = "text-center";
          if (index === 0) alignClass = "text-left";
          if (index === stepTitles.length - 1) alignClass = "text-right";

          return (
            <div
              key={index}
              className={`text-[10px] sm:text-sm font-medium transition-all min-w-0 ${alignClass} ${index + 1 === currentStep
                  ? "text-black dark:text-white"
                  : index + 1 < currentStep
                    ? "text-green-600"
                    : "text-neutral-500"
                }`}
            >
              {title}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
