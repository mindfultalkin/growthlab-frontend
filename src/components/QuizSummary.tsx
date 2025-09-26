import React from "react";
import { Question, Option } from "@/types/types";

interface QuizSummaryProps {
  questions: Question[];
  userAnswers: { [questionId: string]: string[] };
  score: number;
  totalMarks: number;
  onContinue: () => void;
}

// Function to decode HTML entities (same as in Question.tsx)
const decodeHTML = (html: string): string => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

// Function to remove curly braces from text
const removeCurlyBraces = (text: string): string => {
  return text.replace(/\{([^}]+)\}/g, '$1');
};

// Function to render text without curly braces formatting
const renderCleanText = (text: string) => {
  const decodedText = decodeHTML(text);
  const cleanText = removeCurlyBraces(decodedText);
  
  // Handle line breaks
  const lines = cleanText.split(/<br\s*\/?>/i);
  
  return (
    <>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
};

const QuizSummary: React.FC<QuizSummaryProps> = ({
  questions,
  userAnswers,
  score,
  totalMarks,
  onContinue,
}) => {
  const correctCount = questions.filter(question => {
    const userSelected = userAnswers[question.id] || [];
    const correctOptions = question.options.filter(opt => opt.isCorrect).map(opt => opt.id);
    
    if (question.type === "single") {
      return userSelected.length === 1 && correctOptions.includes(userSelected[0]);
    } else {
      const allCorrectSelected = correctOptions.every(id => userSelected.includes(id));
      const noIncorrectSelected = userSelected.every(id => correctOptions.includes(id));
      return allCorrectSelected && noIncorrectSelected;
    }
  }).length;

  const incorrectCount = questions.length - correctCount;

  const isAnswerCorrect = (question: Question) => {
    const userSelected = userAnswers[question.id] || [];
    const correctOptions = question.options.filter(opt => opt.isCorrect).map(opt => opt.id);
    
    if (question.type === "single") {
      return userSelected.length === 1 && correctOptions.includes(userSelected[0]);
    } else {
      const allCorrectSelected = correctOptions.every(id => userSelected.includes(id));
      const noIncorrectSelected = userSelected.every(id => correctOptions.includes(id));
      return allCorrectSelected && noIncorrectSelected;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Summary Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-green-600">
              {questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0}%
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Assessment Complete!</h2>
          <p className="text-gray-600 mb-4">Here's your performance summary</p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-sm text-green-800">Correct Answers</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{incorrectCount}</div>
              <div className="text-sm text-red-800">Incorrect Answers</div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-lg font-semibold text-blue-800">Score: {score}/{totalMarks}</div>
            <div className="text-sm text-blue-600">Total Marks Obtained</div>
          </div>
        </div>

        {/* Questions Review Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Review Your Answers</h3>
          
          <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4">
            {questions.map((question, index) => {
              const userSelected = userAnswers[question.id] || [];
              const isCorrect = isAnswerCorrect(question);
              
              return (
                <div key={question.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  {/* Question Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm text-green-600 mb-1">
                        Question {index + 1} of {questions.length}
                      </div>
                      <h4 className="text-lg font-medium text-green-800">
                        {renderCleanText(question.text)}
                      </h4>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isCorrect 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {question.options.map((option) => {
                      const isUserSelected = userSelected.includes(option.id);
                      const isCorrectOption = option.isCorrect;
                      
                      let optionClass = "relative p-3 rounded-lg border transition-all duration-300";
                      let checkmarkClass = "w-5 h-5 rounded mr-3 flex items-center justify-center";
                      
                      if (isCorrectOption) {
                        optionClass += " bg-green-50 border-green-200";
                        checkmarkClass += " bg-green-500";
                      } else if (isUserSelected && !isCorrectOption) {
                        optionClass += " bg-red-50 border-red-200";
                        checkmarkClass += " bg-red-500";
                      } else {
                        optionClass += " bg-gray-50 border-gray-200";
                        checkmarkClass += question.type === "multiple" ? " rounded border-2 border-gray-300" : " rounded-full border-2 border-gray-300";
                      }

                      return (
                        <div key={option.id} className={optionClass}>
                          <div className="flex items-center">
                            <div className={checkmarkClass}>
                              {isCorrectOption && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {isUserSelected && !isCorrectOption && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                            <span className="text-green-800">{option.text}</span>
                            
                            {/* Indicators */}
                            {isCorrectOption && (
                              <div className="absolute right-3 top-3 text-green-500 font-medium">
                                Correct Answer
                              </div>
                            )}
                            {isUserSelected && !isCorrectOption && (
                              <div className="absolute right-3 top-3 text-red-500 font-medium">
                                Your Answer
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation for incorrect answers */}
                  {!isCorrect && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center text-yellow-800">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">You selected an incorrect option. The correct answer is highlighted in green.</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Continue Button */}
          <div className="text-center mt-8">
            <button
              onClick={onContinue}
              className="bg-green-500 text-white py-3 px-8 rounded-lg font-medium hover:bg-green-600 transition-all duration-300"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizSummary;