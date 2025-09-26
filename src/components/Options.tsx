import React from "react";
import { Option } from "@/types/types";

interface OptionsProps {
  options: Option[];
  selectedOptions: string[];
  isMultiple: boolean;
  onSelect: (optionId: string) => void;
}

const Options: React.FC<OptionsProps> = ({
  options,
  selectedOptions,
  isMultiple,
  onSelect,
}) => {
  const getOptionClass = (option: Option): string => {
    const isSelected = selectedOptions.includes(option.id);
    const baseClass = "relative p-4 rounded-lg cursor-pointer transition-all duration-300 border hover:shadow-md";

    return `${baseClass} ${
      isSelected
        ? "border-green-400 bg-green-50 shadow-md"
        : "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
    }`;
  };

  const getCheckmarkClass = (option: Option): string => {
    return selectedOptions.includes(option.id)
      ? "bg-green-500"
      : "border-2 border-gray-300";
  };

  return (
    <div className="space-y-4 my-8">
      {options.map((option) => (
        <div
          key={option.id}
          className={getOptionClass(option)}
          onClick={() => onSelect(option.id)}
        >
          <div className="flex items-center">
            <div
              className={`w-5 h-5 ${
                isMultiple ? "rounded" : "rounded-full"
              } mr-4 flex items-center justify-center transition-colors duration-300 ${getCheckmarkClass(
                option
              )}`}
            >
              {selectedOptions.includes(option.id) && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span className="text-green-800 text-lg">{option.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Options;