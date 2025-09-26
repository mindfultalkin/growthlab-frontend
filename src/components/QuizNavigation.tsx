import React from "react";

interface QuizNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  onSubmitAssessment: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  canProceed: boolean;
}

const QuizNavigation: React.FC<QuizNavigationProps> = ({
  onPrevious,
  onNext,
  onSubmitAssessment,
  isFirstQuestion,
  isLastQuestion,
  canProceed,
}) => {
  return (
    <div className="flex justify-between items-center mt-8">
      <button
        onClick={onPrevious}
        disabled={isFirstQuestion}
        className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
          isFirstQuestion
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : "bg-green-500 text-white hover:bg-green-600"
        }`}
      >
        Previous
      </button>

      {isLastQuestion ? (
        <button
          onClick={onSubmitAssessment}
          disabled={!canProceed}
          className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
            canProceed
              ? "bg-orange-500 text-white hover:bg-orange-600"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Submit Assessment
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
            canProceed
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Next
        </button>
      )}
    </div>
  );
};

export default QuizNavigation;