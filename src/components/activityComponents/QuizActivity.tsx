// @ts-nocheck
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom"; // ADD: Import useNavigate
import { Question as QuestionType, QuizState } from "@/types/types";
import { fetchAndParseQuestionsFromXML } from "@/utils/XmlParser";
import Question from "@/components/Question";
import Options from "@/components/Options";
import QuizNavigation from "@/components/QuizNavigation";
import QuizSummary from "@/components/QuizSummary";

interface QuizActivityProps {
  triggerSubmit: () => void;
  xmlUrl: string;
  setScorePercentage: React.Dispatch<React.SetStateAction<number>>;
  subconceptMaxscore: number;
  setSubmissionPayload?: React.Dispatch<
    React.SetStateAction<{
      userAttemptFlag: boolean;
      userAttemptScore: number;
    } | null>
  >;
  // ADD: Navigation props for next module functionality
  currentIndex: number;
  subconcepts: any[];
  currentUnitId: string;
  stageId: string;
}

// Sound effect paths - you can replace these with your actual audio files
const SOUND_EFFECTS = {
  QUIZ_LOAD: "/",
  OPTION_SELECT: "/",
  CORRECT_ANSWER: "",
  WRONG_ANSWER: "",
  NAVIGATION: "/",
};

const QuizActivity: React.FC<QuizActivityProps> = ({
  triggerSubmit,
  xmlUrl,
  setScorePercentage,
  subconceptMaxscore,
  setSubmissionPayload,
  // ADD: Destructure new props
  currentIndex,
  subconcepts,
  currentUnitId,
  stageId,
}) => {
  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: 0,
    questions: [],
    selectedOptions: {},
    score: 0,
    timeRemaining: 15 * 60,
    totalMarks: 0,
    showSummary: false,
  });

  // ADD: useNavigate hook for navigation
  const navigate = useNavigate();

  // Add state for activities header text
  const [activitiesHeaderText, setActivitiesHeaderText] = useState<string | null>(null);

  // Add state for image overlay
  const [showImgOverlay, setShowImgOverlay] = useState(false);
  const [overlayImageSrc, setOverlayImageSrc] = useState<string>("");

  // Create refs for audio elements
  const loadSoundRef = useRef<HTMLAudioElement | null>(null);
  const selectSoundRef = useRef<HTMLAudioElement | null>(null);
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);
  const navigationSoundRef = useRef<HTMLAudioElement | null>(null);

  // ADD: Navigation function to handle moving to next subconcept
  const navigateToNextSubconcept = () => {
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < subconcepts.length) {
      // Navigate to next subconcept in the list
      const nextSubconcept = subconcepts[nextIndex];
      console.log("Navigating to next subconcept:", nextSubconcept);
      
      navigate(`/subconcept/${nextSubconcept.subconceptId}`, {
        state: {
          subconcept: nextSubconcept,
          index: nextIndex,
          subconcepts: subconcepts,
          stageId: stageId,
          currentUnitId: currentUnitId,
          subconceptId: nextSubconcept.subconceptId,
        },
        replace: false,
      });
    } else {
      // No more subconcepts, navigate back to subconcepts list
      console.log("No next subconcept, navigating back to list");
      navigate(`/subconcepts/${currentUnitId}`, { replace: true });
    }
  };

  // Initialize audio elements
  useEffect(() => {
    loadSoundRef.current = new Audio(SOUND_EFFECTS.QUIZ_LOAD);
    selectSoundRef.current = new Audio(SOUND_EFFECTS.OPTION_SELECT);
    correctSoundRef.current = new Audio(SOUND_EFFECTS.CORRECT_ANSWER);
    wrongSoundRef.current = new Audio(SOUND_EFFECTS.WRONG_ANSWER);
    navigationSoundRef.current = new Audio(SOUND_EFFECTS.NAVIGATION);

    // Preload audio
    loadSoundRef.current.load();
    selectSoundRef.current.load();
    correctSoundRef.current.load();
    wrongSoundRef.current.load();
    navigationSoundRef.current.load();

    return () => {
      // Cleanup audio elements when component unmounts
      [
        loadSoundRef,
        selectSoundRef,
        correctSoundRef,
        wrongSoundRef,
        navigationSoundRef,
      ].forEach((ref) => {
        if (ref.current) {
          ref.current.pause();
          ref.current = null;
        }
      });
    };
  }, []);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const { questions, activitiesHeaderText } = await fetchAndParseQuestionsFromXML(xmlUrl);
        const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

        setState((prev) => ({
          ...prev,
          questions,
          totalMarks,
        }));

        // Set the activities header text
        setActivitiesHeaderText(activitiesHeaderText);

        // Play loading sound when questions are loaded
        if (loadSoundRef.current) {
          loadSoundRef.current.play();
        }
      } catch (error) {
        console.error("Error fetching or parsing XML:", error);
      }
    };

    if (xmlUrl) {
      loadQuestions();
    }
  }, [xmlUrl]);

  const currentQuestion = state.questions[state.currentQuestionIndex] || null;

  // Play a sound effect
  const playSound = (soundRef) => {
    if (soundRef.current) {
      soundRef.current.currentTime = 0; // Reset sound to beginning
      soundRef.current.play().catch((error) => {
        // Handle autoplay restrictions
        console.warn("Failed to play sound:", error);
      });
    }
  };

  // Handle image overlay
  const handleImageClick = (imageSrc: string) => {
    setOverlayImageSrc(imageSrc);
    setShowImgOverlay(true);
  };

  const handleCloseImageOverlay = () => {
    setShowImgOverlay(false);
    setOverlayImageSrc("");
  };

  const handleOptionSelect = (optionId: string) => {
    // Play option select sound
    playSound(selectSoundRef);

    const questionId = currentQuestion?.id || "";
    const isMultiple = currentQuestion?.type === "multiple";
    const selectedOptions = { ...state.selectedOptions };

    if (isMultiple) {
      // For multiple-choice questions, toggle the selection
      if (!selectedOptions[questionId]) {
        selectedOptions[questionId] = [];
      }

      if (selectedOptions[questionId].includes(optionId)) {
        selectedOptions[questionId] = selectedOptions[questionId].filter(
          (id) => id !== optionId
        );
      } else {
        selectedOptions[questionId] = [
          ...selectedOptions[questionId],
          optionId,
        ];
      }
    } else {
      // For single-choice questions, replace the selection
      selectedOptions[questionId] = [optionId];
    }

    setState((prev) => ({
      ...prev,
      selectedOptions,
    }));
  };

  const handleNext = () => {
    if (state.currentQuestionIndex >= state.questions.length - 1) return;

    // Play navigation sound
    playSound(navigationSoundRef);

    setState((prev) => ({
      ...prev,
      currentQuestionIndex: prev.currentQuestionIndex + 1,
    }));
  };

  const handlePrevious = () => {
    if (state.currentQuestionIndex <= 0) return;

    // Play navigation sound
    playSound(navigationSoundRef);

    setState((prev) => ({
      ...prev,
      currentQuestionIndex: prev.currentQuestionIndex - 1,
    }));
  };

  const evaluateAllAnswers = () => {
    let totalScore = 0;
    const results = state.questions.map(question => {
      const selectedIds = state.selectedOptions[question.id] || [];
      const correctOptionIds = question.options
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.id);

      let isCorrect = false;

      if (question.type === "single") {
        isCorrect =
          selectedIds.length === 1 && correctOptionIds.includes(selectedIds[0]);
      } else {
        const allCorrectSelected = correctOptionIds.every((id) =>
          selectedIds.includes(id)
        );
        const noIncorrectSelected = selectedIds.every((id) =>
          correctOptionIds.includes(id)
        );
        isCorrect = allCorrectSelected && noIncorrectSelected;
      }

      if (isCorrect) {
        totalScore += question.marks;
      }

      return {
        question,
        selectedOptions: selectedIds,
        isCorrect,
        correctOptions: correctOptionIds
      };
    });

    return { totalScore, results };
  };

  const handleSubmitAssessment = () => {
    const { totalScore, results } = evaluateAllAnswers();
    
    // Play navigation sound for submit
    playSound(navigationSoundRef);

    setState((prev) => ({
      ...prev,
      score: totalScore,
      showSummary: true,
    }));
  };

  // UPDATE: Modified to include navigation after submission
  const handleSummaryContinue = () => {
    const percentage = (state.score / subconceptMaxscore) * 100;

    // Set the score percentage
    setScorePercentage(percentage);

    // Set the submission payload
    setSubmissionPayload?.({
      userAttemptFlag: true,
      userAttemptScore: state.score,
    });

    console.log("Quiz completed, triggering submit and navigation");

    // Trigger submit
    triggerSubmit();

    // ADD: Navigate to next subconcept after a short delay to ensure submission process starts
    setTimeout(() => {
      navigateToNextSubconcept();
    }, 500);
  };

  if (state.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-pulse text-lg text-[#f48d03] font-medium">
          Loading quiz...
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  // Show summary after assessment submission
  if (state.showSummary) {
    return (
      <QuizSummary
        questions={state.questions}
        userAnswers={state.selectedOptions}
        score={state.score}
        totalMarks={state.totalMarks}
        onContinue={handleSummaryContinue}
      />
    );
  }

  const questionId = currentQuestion.id;
  const selectedOptions = state.selectedOptions[questionId] || [];
  const canProceed = selectedOptions.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans p-4 relative">
      {/* Professional overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-slate-100/30 z-0" />
      <div className="relative z-10 w-full py-10 px-4">
        <div className="max-w-7xl mx-auto border border-slate-200 shadow-xl rounded-2xl p-6 md:p-8 w-full transition-all duration-300 relative bg-white/95 backdrop-blur-sm z-10">
          <div className="flex justify-between items-center mb-6">
            {activitiesHeaderText && (
              <h2 className="text-xl font-semibold bg-gradient-to-r from-[#f48d03] to-[#e67e00] bg-clip-text text-transparent mb-6">
                {activitiesHeaderText}
              </h2>
            )}
          </div>

          <div className="flex flex-col">
            <Question
              question={currentQuestion}
              currentIndex={state.currentQuestionIndex}
              totalQuestions={state.questions.length}
              activitiesHeaderText={activitiesHeaderText}
              onImageClick={handleImageClick}
            />

            <Options
              options={currentQuestion.options}
              selectedOptions={selectedOptions}
              isMultiple={currentQuestion.type === "multiple"}
              onSelect={handleOptionSelect}
            />

            <QuizNavigation
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSubmitAssessment={handleSubmitAssessment}
              isFirstQuestion={state.currentQuestionIndex === 0}
              isLastQuestion={state.currentQuestionIndex === state.questions.length - 1}
              canProceed={canProceed}
            />
          </div>
        </div>
      </div>

      {/* Image Overlay - positioned relative to the entire quiz container */}
      {showImgOverlay && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm"
          onClick={handleCloseImageOverlay}
        >
          <img
            src={overlayImageSrc}
            alt="Full question visual"
            className="max-h-[90vh] max-w-[95vw] w-auto rounded shadow-lg border-4 border-white"
            style={{ objectFit: "contain" }}
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl font-bold bg-black bg-opacity-70 rounded-full px-3 py-1 hover:bg-opacity-90 focus:outline-none transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              handleCloseImageOverlay();
            }}
            aria-label="Close image overlay"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizActivity;