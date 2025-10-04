// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/AuthContext";
import MediaContent from "@/components/MediaContent";
import ActivityCompletionModal from "@/components/ActivityCompletionModal";
import VocabularyActivity from "@/components/activityComponents/VocabularyActivity";
import QuizActivity from "@/components/activityComponents/QuizActivity";
import VocabularyLearning from "@/components/activityComponents/vocabulary-learning/vocabulary-learning";
import LoadingOverlay from "@/components/LoadingOverlay";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Timer } from "lucide-react";

// @ts-ignore
const ErrorOverlay = ({ countdown = 5, onClose }) => {
  const [timer, setTimer] = useState(countdown);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    } else {
      onClose();
    }
  }, [timer, onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl border border-red-200"
      >
        <div className="bg-white/80 backdrop-blur-sm py-4 px-6 border-b border-red-200/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Activity Error
            </h2>
            <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              Retry Required
            </div>
          </div>
        </div>

        <div className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="flex justify-center mb-6"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </motion.div>

          <h3 className="text-2xl font-bold mb-4 text-red-700">
            Something Went Wrong
          </h3>

          <p className="text-base leading-relaxed mb-6 text-slate-600">
            We encountered an issue while processing your activity. Please try again to continue your learning.
          </p>

          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            <Timer className="w-4 h-4" />
            <span>
              Closing in{" "}
              <span className="font-semibold text-slate-700">{timer}</span>{" "}
              seconds
            </span>
          </div>
        </div>

        <div className="h-1 bg-red-200">
          <motion.div
            initial={{ width: "0%" }}
            animate={{
              width: `${((countdown - timer) / countdown) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
            className="h-full bg-red-500"
          />
        </div>
      </motion.div>
    </div>
  );
};

const SingleSubconcept = () => {
  const { user, selectedCohortWithProgram } = useUserContext();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [successOverlay, setSuccessOverlay] = useState(false);
  const [errorOverlay, setErrorOverlay] = useState(false);
  const [onFrameLoad, setOnFrameLoad] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const sessionId = localStorage.getItem("sessionId");
  const [subconcept, setSubconcept] = useState(location.state?.subconcept);
  const [subconceptId, setSubconceptId] = useState(subconcept?.subconceptId);
  const [showGoBack, setShowGoBack] = useState(
    subconcept?.subconceptType?.toLowerCase() === "vocab"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scorePercentage, setScorePercentage] = useState<null | number>(null);

  console.log("Current Subconcept:", subconcept);

  // ADD: Restore submissionPayload state for React activity components
  const [submissionPayload, setSubmissionPayload] = useState<{
    userAttemptFlag: boolean;
    userAttemptScore: number;
  } | null>(null);

  const currentUnitId = location.state?.currentUnitId;
  const stageId = location.state?.stageId;
  const currentIndex = location.state?.index || 0;
  const subconcepts = location.state?.subconcepts || [];

  // If location.state was not passed (for example when navigating via navigate()),
  // attempt to recover the subconcept using the URL or the subconcepts array.
  useEffect(() => {
    if (!location.state || !location.state.subconcept) {
      // Try to parse subconceptId from the pathname (/subconcept/:id)
      try {
        const parts = location.pathname.split("/");
        const idFromPath = parts[parts.length - 1];
        if (idFromPath) {
          // Try to find it in provided subconcepts list
          const found = (location.state?.subconcepts || subconcepts).find(
            (s) => String(s?.subconceptId) === String(idFromPath)
          );
          if (found) {
            setSubconcept(found);
            setSubconceptId(found.subconceptId);
            return;
          }

          // As a last resort, set subconceptId so iframe will attempt to load using stored link
          setSubconceptId(idFromPath);
        }
      } catch (err) {
        console.warn("Failed to recover subconcept from URL:", err);
      }
    }
  }, [location.pathname]);

  // Keep showIframe/showSubmit/showGoBack in sync when subconcept value changes
  useEffect(() => {
    setShowGoBack(
      Boolean(subconcept?.subconceptType && subconcept.subconceptType.toLowerCase() === "vocab")
    );

    setShowIframe(
      ![
        "video",
        "audio",
        "pdf",
        "image",
        "assignment_video",
        "assignment_audio",
        "assignment_pdf",
        "assignment_image",
        "assessment",
        "youtube",
        "mtf",
        "mcq",
        "word",
        "ted",
        "medium",
        "toastmasters",
        "pdfAsPpt",
      ].includes(subconcept?.subconceptType)
    );

    setShowSubmit(Boolean(subconcept?.subconceptType && String(subconcept.subconceptType).toLowerCase().startsWith("assignment")));
  }, [subconcept]);

  const [showIframe, setShowIframe] = useState(
    ![
      "video",
      "audio",
      "pdf",
      "image",
      "assignment_video",
      "assignment_audio",
      "assignment_pdf",
      "assignment_image",
      "assessment",
      "youtube",
      "mtf",
      "mcq",
      "word",
      "ted",
      "medium",
      "toastmasters",
      "pdfAsPpt"
    ].includes(subconcept?.subconceptType)
  );

  const [showSubmit, setShowSubmit] = useState(
    subconcept?.subconceptType?.toLowerCase().startsWith("assignment")
  );

  const submitBtnRef = useRef(null);

  useEffect(() => {
    if (location.state?.subconcept) {
      setSubconcept(location.state.subconcept);
      setSubconceptId(location.state.subconcept.subconceptId);
    }
  }, [location.state]);

  useEffect(() => {
    if (user) {
      const userData = {
        userAttemptStartTimestamp: new Date().toISOString(),
        unitId: currentUnitId,
        programId: selectedCohortWithProgram?.program?.programId,
        stageId: stageId,
        userId: user.userId,
        sessionId: sessionId,
        subconceptId: subconcept?.subconceptId,
        subconceptMaxscore: subconcept?.subconceptMaxscore,
        API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
        cohortId: selectedCohortWithProgram?.cohortId,
      };
      localStorage.setItem("userData", JSON.stringify(userData));
    }
  }, [user, subconcept]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "enableSubmit") {
        setShowSubmit(true);
      } else if (event.data === "disableSubmit") {
        setShowSubmit(false);
      } else if (event.data?.type === "scoreData") {
        setScorePercentage(
          (event.data.payload?.userAttemptScore / subconcept?.subconceptMaxscore) * 100
        );
        handlePostScore(event.data.payload);
      } else if (event.data === "confirmSubmission") {
        setSuccessOverlay(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [subconcept?.subconceptLink, subconcept?.subconceptMaxscore]);

  // UPDATE: Modified handlePostScore to handle both iframe and React components
  const handlePostScore = (payload: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const userData = JSON.parse(localStorage.getItem("userData") || "{}");

    if (!userData || Object.keys(userData).length === 0) {
      console.error("No user data available for POST request.");
      setIsSubmitting(false);
      return;
    }

    const finalPayload = {
      ...payload,
      userAttemptStartTimestamp: userData.userAttemptStartTimestamp,
      userAttemptEndTimestamp: new Date().toISOString(),
      unitId: userData.unitId,
      programId: userData.programId,
      stageId: userData.stageId,
      userId: userData.userId,
      sessionId: userData.sessionId,
      subconceptId: userData.subconceptId,
      cohortId: userData.cohortId,
    };

    console.log("Final Payload for POST request:", finalPayload);

    fetch(`${userData.API_BASE_URL}/user-attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalPayload),
    })
      .then((response) => {
        if (response.ok) {
          // Handle iframe success
          const iframe = document.getElementById("embeddedContent") as HTMLIFrameElement;
          if (iframe && iframe.tagName === "IFRAME") {
            iframe.contentWindow?.postMessage("postSuccess", "*");
          } 
          // Handle React components success
          else if (
            subconcept?.subconceptType?.toLowerCase() === "mtf" ||
            subconcept?.subconceptType?.toLowerCase() === "mcq" ||
            subconcept?.subconceptType?.toLowerCase() === "word"
          ) {
            //setSuccessOverlay(true);
          }
        } else {
          setErrorOverlay(true);
        }
        return response.json();
      })
      .then((data) => {
        const percentage = subconcept?.subconceptMaxscore === 0
          ? 100
          : (payload?.userAttemptScore / subconcept?.subconceptMaxscore) * 100;
        setScorePercentage(percentage);
      })
      .catch((error) => {
        console.error("Error submitting score:", error);
        setErrorOverlay(true);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  // UPDATE: Modified triggerSubmit to store payload for React components
  const triggerSubmit = (payload: any) => {
    console.log("Trigger submit called with payload:", payload);
    // Store the payload for React components
    setSubmissionPayload(payload);
    // Auto-submit for React components
    handlePostScore(payload);
  };

  // UPDATE: Modified handleSubmit to handle both iframe and React components properly
  const handleSubmit = () => {
    if (isSubmitting) {
      console.log("Preventing duplicate submission");
      return;
    }

    if (
      subconcept?.subconceptType?.toLowerCase() === "mtf" ||
      subconcept?.subconceptType?.toLowerCase() === "mcq" ||
      subconcept?.subconceptType?.toLowerCase() === "word"
    ) {
      // Use stored payload for React components
      if (!submissionPayload) {
        console.error("No submission payload available for React component");
        return;
      }
      console.log("Handling React component submission with payload:", submissionPayload);
      handlePostScore(submissionPayload);
    } else {
      // Handle iframe submission
      const iframe = document.getElementById("embeddedContent");
      if (iframe && iframe.tagName === "IFRAME") {
        (iframe as HTMLIFrameElement).contentWindow?.postMessage("submitClicked", "*");
        (iframe as HTMLIFrameElement).contentWindow?.postMessage(
          {
            action: "subconceptData",
            subconceptMaxscore: subconcept?.subconceptMaxscore
          },
          "*"
        );
      }
    }
  };

  const handleGoBack = () => {
    navigate(`/subconcepts/${currentUnitId}`);
  };

  // FIX: Updated handleSuccessClose to only close overlay, not navigate
  const handleSuccessClose = () => {
    setSuccessOverlay(false);
    // REMOVED: navigate(`/subconcepts/${currentUnitId}`);
    // Let the React activity components handle their own navigation
  };

  return (
    <>
      {successOverlay && (
        <ActivityCompletionModal
          countdownDuration={3}
          onClose={handleSuccessClose} // This will only close the overlay now
          scorePercentage={scorePercentage}
        />
      )}
      {errorOverlay && (
        <ErrorOverlay countdown={5} onClose={() => setErrorOverlay(false)} />
      )}
      <div key={subconceptId} className="flex flex-col md:flex-row w-full">
        <div className="flex-1 m-[2px]">
          {(() => {
            if (subconcept?.subconceptType === "mtf") {
              return (
                <VocabularyActivity
                  triggerSubmit={triggerSubmit}
                  xmlUrl={subconcept?.subconceptLink}
                  setScorePercentage={setScorePercentage}
                  subconceptMaxscore={subconcept?.subconceptMaxscore}
                  // ADD: Pass navigation props for next module functionality
                  currentIndex={currentIndex}
                  subconcepts={subconcepts}
                  currentUnitId={currentUnitId}
                  stageId={stageId}
                  // ADD: Pass setSubmissionPayload for storing payload
                  setSubmissionPayload={setSubmissionPayload}
                />
              );
            } else if (subconcept?.subconceptType === "mcq") {
              return (
                <QuizActivity
                  triggerSubmit={triggerSubmit}
                  xmlUrl={subconcept?.subconceptLink}
                  setScorePercentage={setScorePercentage}
                  subconceptMaxscore={subconcept?.subconceptMaxscore}
                  // ADD: Pass navigation props for next module functionality
                  currentIndex={currentIndex}
                  subconcepts={subconcepts}
                  currentUnitId={currentUnitId}
                  stageId={stageId}
                  // ADD: Pass setSubmissionPayload for storing payload
                  setSubmissionPayload={setSubmissionPayload}
                />
              );
            } else if (subconcept?.subconceptType === "word") {
              return (
                <VocabularyLearning
                  triggerSubmit={triggerSubmit}
                  xmlUrl={subconcept?.subconceptLink}
                  setScorePercentage={setScorePercentage}
                  subconceptMaxscore={subconcept?.subconceptMaxscore}
                  // ADD: Pass navigation props for next module functionality
                  currentIndex={currentIndex}
                  subconcepts={subconcepts}
                  currentUnitId={currentUnitId}
                  stageId={stageId}
                  // ADD: Pass setSubmissionPayload for storing payload
                  setSubmissionPayload={setSubmissionPayload}
                />
              );
            } else if (showIframe) {
              return (
                <div className="relative w-full min-h-[500px] sm:min-h-[800px]">
                  {isIframeLoading && <LoadingOverlay />}
                  {iframeError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <p className="text-red-500 text-xl mb-4">
                          Failed to load content
                        </p>
                        <button
                          onClick={() => {
                            setIframeError(false);
                            setIsIframeLoading(true);
                            const iframe = document.getElementById(
                              "embeddedContent"
                            ) as HTMLIFrameElement;
                            if (iframe) {
                              iframe.src = iframe.src;
                            }
                          }}
                          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      id="embeddedContent"
                      src={subconcept?.subconceptLink}
                      title="Embedded Content"
                      className={`w-full min-h-[500px] sm:min-h-[800px]`}
                      onLoad={() => {
                        console.log("Iframe loaded");
                        console.log(subconcept?.subconceptLink);
                        setShowGoBack(true);
                        setOnFrameLoad(true);
                        setIsIframeLoading(false);
                      }}
                      onError={() => {
                        setIframeError(true);
                        setIsIframeLoading(false);
                      }}
                      allow="autoplay"
                    />
                  )}
                </div>
              );
            } else {
              return (
                <MediaContent
                  currentSubconcept={subconcept}
                  currentUnitId={currentUnitId}
                  index={currentIndex}
                  subconcepts={subconcepts}
                />
              );
            }
          })()}
        </div>

        {showIframe && (
          <div className="fixed md:sticky border-t-2 border-t-white bg-[#D5DEE7] h-auto bottom-0 flex md:flex-col flex-row items-center md:justify-start justify-center p-1 md:mr-0 gap-10 w-full md:w-[100px] ">
            {showGoBack && (
              <button
                onClick={handleGoBack}
                className="bg-[#5bc3cd] hover:bg-[#DB5788] text-white md:w-[85px] md:h-[85px] h-[60px] w-[60px] font-[700] md:text-[16px] text-xs font-['system-ui'] rounded-full flex flex-col items-center justify-center md:relative md:top-48 z-[99] gap-1"
              >
                <img
                  src="/icons/User-icons/back-white.png"
                  alt="Go Back Icon"
                  className="md:w-6 md:h-6 h-4 w-4"
                />
                Go back
              </button>
            )}

            {showSubmit && (
              <button
                ref={submitBtnRef}
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="bg-[#5bc3cd] hover:bg-[#DB5788] text-white md:w-[85px] md:h-[85px] h-[60px] w-[60px] font-[700] md:text-[16px] text-xs font-['system-ui'] rounded-full flex flex-col items-center justify-center md:relative md:top-48 z-[99] gap-1"
              >
                <img
                  src="/icons/User-icons/send.png"
                  alt="Submit Icon"
                  className="md:w-6 md:h-6 h-4 w-4"
                />
                Submit
              </button>
            )}
          </div>
        )}

        {/* Hidden external Submit Button for New React Activity components type only */}
        {(subconcept?.subconceptType === "mtf" ||
          subconcept?.subconceptType === "mcq" ||
          subconcept?.subconceptType === "word") && (
          <button
            ref={submitBtnRef}
            onClick={handleSubmit}
            style={{ display: "none" }}
          >
            Hidden Submit
          </button>
        )}
      </div>
    </>
  );
};

export default SingleSubconcept;