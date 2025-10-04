// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UploadModal } from "./modals/UploadModal";
import AlertModal from "./modals/AlertModal";
import { RetryModal } from "./modals/RetryModal";
import { FileUploaderRecorder } from "./FileUploaderRecorder";
import ActivityCompletionModal from "./ActivityCompletionModal";
import AssignmentStatusModal from "./modals/AssignmentStatusModal";
import axios from "axios";
import { Button } from "./ui/button";
import { BookOpen, Mic } from "lucide-react";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Keyboard, EffectFade } from 'swiper/modules';
import { usePdfToImages } from '../hooks/usePdfToImages';
import { RotateCcw, Book } from "lucide-react";

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

// Icon Components
const PlayIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const HeadphonesIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h2l2 8h2l2-8h2l2 8h2l2-8h2m2 8a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PracticeIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const ReadIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

// Helper function to get icon and type info for next subconcept
const getNextContentInfo = (nextSubconcept) => {
  if (!nextSubconcept) return { icon: ReadIcon, type: "Content", duration: null };
  
  const type = nextSubconcept.subconceptType?.toLowerCase();
  
  if (type?.includes('video')) {
    return { 
      icon: PlayIcon, 
      type: "Video", 
      duration: nextSubconcept.duration || "10 min" 
    };
  } else if (type?.includes('audio')) {
    return { 
      icon: HeadphonesIcon, 
      type: "Audio", 
      duration: nextSubconcept.duration || "5 min" 
    };
  } else if (type?.includes('assessment') || type?.includes('assignment') || 
             type?.includes('mcq') || type?.includes('match')) {
    return { 
      icon: PracticeIcon, 
      type: "Practice", 
      duration: nextSubconcept.duration || "15 min" 
    };
  } else {
    return { 
      icon: ReadIcon, 
      type: "Reading", 
      duration: nextSubconcept.duration || "10 min" 
    };
  }
};

// Professional Clean Overlay Component (No Card Background)
const NextContentOverlay = ({ 
  nextSubconcept, 
  progress, 
  onReplay, 
  onContinue, 
  onCancel 
}) => {
  const { icon: IconComponent, type, duration } = getNextContentInfo(nextSubconcept);
  const navigate = useNavigate();
  const location = useLocation();
  // @ts-ignore
  const userData = JSON.parse(localStorage.getItem("userData"));

  // Utility function to format seconds -> MM:SS
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const sendCurrentAttemptData = () => {
    const currentSubconcept = location.state?.subconcept;
    if (!currentSubconcept) return;

    const finalScore = currentSubconcept?.subconceptMaxscore || 0;

    const date = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const ISTTime = new Date(date.getTime() + ISTOffset);
    const formattedISTTimestamp = ISTTime.toISOString().slice(0, 19);

    const payload = {
      userAttemptFlag: true,
      userAttemptScore: finalScore,
      userAttemptStartTimestamp: userData.userAttemptStartTimestamp,
      userAttemptEndTimestamp: formattedISTTimestamp,
      unitId: userData.unitId,
      programId: userData.programId,
      stageId: userData.stageId,
      userId: userData.userId,
      sessionId: userData.sessionId,
      subconceptId: currentSubconcept.subconceptId,
      cohortId: userData.cohortId,
    };

    fetch(`${userData.API_BASE_URL}/user-attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Request failed");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Current content marked as completed", data);
      })
      .catch((error) => {
        console.error("Error marking current content as completed:", error);
      });
  };

  const handleStart = () => {
    sendCurrentAttemptData();
    navigate(`/subconcept/${nextSubconcept?.subconceptId}`, {
      state: {
        subconcept: nextSubconcept,
        index: location.state?.index ? location.state.index + 1 : 1,
        subconcepts: location.state?.subconcepts || [],
        stageId: location.state?.stageId,
        currentUnitId: location.state?.currentUnitId, 
        subconceptId: nextSubconcept?.subconceptId
      },
      replace: true
    });
  };

  const handleReplay = () => {
    sendCurrentAttemptData();
    onReplay();
  };

  const handleCancel = () => {
    sendCurrentAttemptData();
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="text-white max-w-4xl w-full flex items-start gap-8">
        
        {/* Icon on Left */}
        <div className="w-28 h-28 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm flex-shrink-0">
          <IconComponent className="w-14 h-14 text-white" />
        </div>
        
        {/* Content on Right */}
        <div className="flex-1 text-left">
          {/* Up Next */}
          <h2 className="text-lg font-medium text-white/80 mb-2">
            Up Next
          </h2>

          {/* Big Elevated Title (from description) */}
          <h3 className="text-3xl font-bold mb-2 leading-tight">
            {nextSubconcept.subconceptDesc}
          </h3>

          {/* Duration */}
          {duration && (
            <div className="text-white/70 text-lg mb-4">
              Duration: {formatDuration(nextSubconcept.subconceptDuration)}
            </div>
          )}

          {/* Starts In */}
          <div className="mb-6">
            <div className="text-lg font-medium mb-2">
              Starts in <span className="text-green-500">{Math.ceil((100 - progress) / 20)}</span> seconds
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-6">
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-white text-gray-900 rounded-xl font-semibold text-lg transition-all duration-200 hover:bg-gray-100 hover:scale-105 shadow-lg"
            >
              Start
            </button>
            <button
              onClick={handleCancel}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-lg transition-all duration-200 border border-white/20 hover:border-white/30"
            >
              Cancel
            </button>
            <button
              onClick={handleReplay}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-lg transition-all duration-200 border border-white/20 hover:border-white/30 flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Replay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// Browser-style PDF Viewer Component with Full Width and Scrolling
const PDFBrowserViewer = ({ pdfUrl, onContentLoaded }: { pdfUrl: string; onContentLoaded?: () => void }) => {
  const { images, totalPages, loading, error, progress } = usePdfToImages(pdfUrl);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1.2);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (images.length > 0 && !loading) {
      onContentLoaded?.();
    }
  }, [images, loading, onContentLoaded]);

  const handleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border-2 border-red-200">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 text-6xl mb-4 animate-bounce">📄</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">PDF Loading Failed</h3>
          <p className="text-gray-600 mb-4 text-sm">{error}</p>
          <p className="text-gray-500 mb-6 text-sm">Unable to process the document. Please try reloading the page.</p>
        </div>
      </div>
    );
  }

  if (loading || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl">
        <div className="text-center p-8 max-w-md">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Document</h3>
          {totalPages > 0 && (
            <p className="text-gray-500 text-sm mb-4">
              Processing {totalPages} pages ({progress}% complete)
            </p>
          )}
          <div className="w-64 bg-gray-200 rounded-full h-3 mx-auto overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'w-full'
        }`}
      style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 180px)' }}
    >
      <div
        ref={scrollContainerRef}
        className="w-full h-full pt-12 overflow-auto"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        <div className="flex flex-col items-center py-4 space-y-4 ">
          {images.map((page, index) => (
            <div
              key={page.pageNumber}
              className="bg-white shadow-lg border border-gray-300 max-w-[90%] md:max-w-[80%]"
              style={{
                width: `${zoom * 100}%`
              }}
            >
              <img
                src={page.imageData}
                alt={`Page ${page.pageNumber}`}
                className="w-full h-auto block"
                style={{
                  imageRendering: 'auto',
                  objectFit: 'contain',
                  objectPosition: 'center',
                }}
                loading={index < 3 ? "eager" : "lazy"}
                decoding="auto"
                fetchPriority={index < 3 ? "high" : "auto"}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Professional PDF Slide Viewer Component
const PDFSlideViewer = ({ 
  pdfUrl, 
  onContentLoaded, 
  onLastSlideReached 
}: { 
  pdfUrl: string; 
  onContentLoaded?: () => void;
  onLastSlideReached?: () => void;
}) => {
  const { images, totalPages, loading, error, progress } = usePdfToImages(pdfUrl);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lastSlideReached, setLastSlideReached] = useState(false);

  useEffect(() => {
    if (images.length > 0 && !loading) {
      onContentLoaded?.();
    }
  }, [images, loading, onContentLoaded]);

  const handleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const goToSlide = (slideIndex: number) => {
    if (swiperInstance && slideIndex >= 0 && slideIndex < images.length) {
      swiperInstance.slideTo(slideIndex);
    }
  };

  const handleSlideChange = (swiper) => {
    const newSlide = swiper.activeIndex + 1;
    setCurrentSlide(newSlide);
    
    // Check if this is the last slide and trigger callback
    if (swiper.activeIndex === images.length - 1 && !lastSlideReached && onLastSlideReached) {
      setLastSlideReached(true);
      onLastSlideReached();
    } else if (swiper.activeIndex !== images.length - 1) {
      setLastSlideReached(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border-2 border-red-200">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 text-6xl mb-4 animate-bounce">📄</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">PDF Loading Failed</h3>
          <p className="text-gray-600 mb-4 text-sm">{error}</p>
          <p className="text-gray-500 mb-6 text-sm">Unable to process document. Please try reloading.</p>
        </div>
      </div>
    );
  }

  if (loading || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl">
        <div className="text-center p-8 max-w-md">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Document</h3>
          {totalPages > 0 && (
            <p className="text-gray-500 text-sm mb-4">
              Processing {totalPages} pages ({progress}% complete)
            </p>
          )}
          <div className="w-64 bg-gray-200 rounded-full h-3 mx-auto overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0 bg-white' : 'w-full bg-white'
        }`}
      style={{ 
        height: isFullscreen ? '100vh' : 'calc(100vh - 180px)',
        maxHeight: isFullscreen ? '100vh' : 'calc(100vh - 180px)'
      }}
    >
      {/* Fullscreen Button - Positioned properly in top right */}
      <div className="absolute top-[8vh] right-10 z-50">
        <button
          onClick={handleFullscreen}
          className="p-3 rounded-lg bg-white/95 hover:bg-white transition-all duration-300 shadow-lg border border-gray-200 hover:border-gray-300 hover:shadow-xl"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9V4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15v4.5M15 15h4.5m-4.5 0l5.5 5.5" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>

      <div className="relative w-full h-full pt-2 pb-16 flex flex-col">
        <div className="flex-1 min-h-0">
          <Swiper
            modules={[Navigation, Pagination, Keyboard, EffectFade]}
            spaceBetween={0}
            slidesPerView={1}
            navigation={{
              nextEl: '.swiper-button-next-custom',
              prevEl: '.swiper-button-prev-custom',
            }}
            pagination={{
              clickable: true,
              bulletClass: 'swiper-pagination-bullet-custom',
              bulletActiveClass: 'swiper-pagination-bullet-active-custom',
            }}
            keyboard={{
              enabled: true,
            }}
            effect="fade"
            fadeEffect={{
              crossFade: true,
            }}
            speed={300}
            onSwiper={setSwiperInstance}
            onSlideChange={handleSlideChange}
            className="w-full h-full"
          >
            {images.map((page, index) => (
              <SwiperSlide key={page.pageNumber} className="flex items-center justify-center">
                <div className="w-full h-full flex items-center justify-center p-2 md:p-4">
                  <div className="relative w-full h-full max-w-full max-h-full bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 flex items-center justify-center">
                    <img
                      src={page.imageData}
                      alt={`Slide ${page.pageNumber}`}
                      className="max-w-full max-h-full object-contain"
                      style={{
                        width: 'auto',
                        height: 'auto',
                        maxWidth: '95%',
                        maxHeight: '95%'
                      }}
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  </div>
                </div>
              </SwiperSlide>
            ))}

            <div className="swiper-button-prev-custom absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all duration-300 group shadow-lg border border-gray-200 hover:border-gray-300 z-20 cursor-pointer">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-600 group-hover:text-gray-800 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>

            <div className="swiper-button-next-custom absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all duration-300 group shadow-lg border border-gray-200 hover:border-gray-300 z-20 cursor-pointer">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-600 group-hover:text-gray-800 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Swiper>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 text-gray-800 p-3">
          <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-3">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => goToSlide(currentSlide - 2)}
                disabled={currentSlide <= 1}
                className="flex items-center space-x-1 sm:space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium text-gray-700 border border-gray-200 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Previous</span>
              </button>

              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={currentSlide}
                  onChange={(e) => {
                    const slide = parseInt(e.target.value);
                    if (slide >= 1 && slide <= images.length) {
                      goToSlide(slide - 1);
                    }
                  }}
                  className="w-14 px-2 py-1 text-center bg-white text-gray-700 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                  min="1"
                  max={images.length}
                />
                <span className="text-gray-500 text-sm">of {images.length}</span>
              </div>

              <button
                onClick={() => goToSlide(currentSlide)}
                disabled={currentSlide >= images.length}
                className="flex items-center space-x-1 sm:space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium text-gray-700 border border-gray-200 text-sm"
              >
                <span className="hidden sm:inline">Next</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="flex items-center space-x-3 flex-1 max-w-md">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentSlide / images.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-500 whitespace-nowrap min-w-12">
                {Math.round((currentSlide / images.length) * 100)}%
              </span>
            </div>

            <div className="text-gray-400 text-xs hidden lg:block">
              Use arrow keys or swipe
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .swiper-pagination-bullet-custom {
          width: 8px;
          height: 8px;
          background: #d1d5db;
          border-radius: 50%;
          transition: all 0.3s ease;
          cursor: pointer;
          margin: 0 3px;
          border: 1px solid #e5e7eb;
        }
        
        .swiper-pagination-bullet-active-custom {
          background: #3b82f6;
          transform: scale(1.2);
          border-color: #3b82f6;
        }
        
        .swiper-pagination {
          bottom: 70px !important;
          z-index: 10;
        }
      `}</style>
    </div>
  );
};

// @ts-ignore
const MediaContent = ({ currentSubconcept, currentUnitId, subconcepts, index }) => {
  const location = useLocation();
  const [playedPercentage, setPlayedPercentage] = useState(0);
  const [subconceptsList, setSubconceptsList] = useState(subconcepts);
  const [currentIndex, setCurrentIndex] = useState(index);
  const [subconceptData, setSubconceptData] = useState(currentSubconcept);
  // @ts-ignore
  const userData = JSON.parse(localStorage.getItem("userData"));
  const [isComplete, setIsComplete] = useState(
    !(
      subconceptData?.subconceptType?.startsWith("assessment") ||
      subconceptData?.subconceptType?.startsWith("assignment_image") ||
      subconceptData?.subconceptType?.startsWith("pdf") ||
      subconceptData?.subconceptType?.startsWith("assignment_pdf") ||
      subconceptData?.subconceptType?.startsWith("image") ||
      subconceptData?.subconceptType?.startsWith("youtube") ||
      subconceptData?.subconceptType?.startsWith("ted") ||
      subconceptData?.subconceptType?.startsWith("medium") ||
      subconceptData?.subconceptType?.startsWith("toastmasters")
    )
  );
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showManualButton, setShowManualButton] = useState(false);
  const contentRef = useRef(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(3);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorCountdown, setErrorCountdown] = useState(3);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [isAssignmentUploadSuccesfull, setIsAssignmentUploadSuccesfull] = useState(false);
  const [isAssessmentIntegrityChecked, setIsAssessmentIntegrityChecked] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const [scorePercentage, setScorePercentage] = useState<null | number>(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [assignmentData, setAssignmentData] = useState<{
    not_corrected?: any;
    corrected?: any;
    corrected_with_file?: any;
  }>({});
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [isAssignmentStatusModalOpen, setIsAssignmentStatusModalOpen] = useState(false);

  const [showOverlay, setShowOverlay] = useState(false);
  const [progress, setProgress] = useState(0);
  const [nextsubconcept, setNextSubconcept] = useState(subconcepts[index + 1] || null);
  const progressIntervalRef = useRef(null);

  // Add this useEffect to keep states in sync
  useEffect(() => {
    if (subconceptsList && currentIndex >= 0) {
      setSubconceptData(subconceptsList[currentIndex]);
      setNextSubconcept(subconceptsList[currentIndex + 1] || null);
    }
  }, [currentIndex, subconceptsList]);

  useEffect(() => {
    if (subconcepts && subconcepts.length > 0) {
      setNextSubconcept(subconcepts[index + 1] || null);
    }
  }, [subconcepts, index]);

  const appendParamsToUrl = (url, userId, cohortId) => {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    const keys = [...params.keys()];
    if (keys.length < 2) {
      console.error("URL does not have enough entry parameters.");
      return url;
    }
    params.set(keys[0], userId);
    params.set(keys[1], cohortId);
    return urlObj.toString();
  };

  const openAssessment = () => {
    window.open(
      subconceptData?.subconceptLink + "=" + userData?.userId,
      "_blank"
    );
  };

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/assignments/user-assignment?userId=${userData?.userId}&subconceptId=${subconceptData?.subconceptId}`
        );

        const data = response.data;

        const formattedData = {
          status: data.status,
          submittedFile: {
            name: data.submittedFile.fileName,
            downloadUrl: data.submittedFile.downloadUrl,
          },
          correctedFile: data.correctedFile
            ? {
              name: data.correctedFile.fileName,
              downloadUrl: data.correctedFile.downloadUrl,
            }
            : undefined,
          score: data.score,
          remarks: data.remarks,
        };

        if (data.status === "not_corrected") {
          setAssignmentData((prev) => ({
            ...prev,
            not_corrected: formattedData,
          }));
          setCurrentStatus("not_corrected");
        } else if (data.status === "corrected" && data.correctedFile) {
          setAssignmentData((prev) => ({
            ...prev,
            corrected_with_file: formattedData,
          }));
          setCurrentStatus("corrected_with_file");
        } else if (data.status === "corrected") {
          setAssignmentData((prev) => ({
            ...prev,
            corrected: formattedData,
          }));
          setCurrentStatus("corrected");
        }
        setIsAssignmentStatusModalOpen(true);
      } catch (error) {
        console.error("Error fetching assignment:", error);
      }
    };

    if (
      userData?.userId &&
      subconceptData?.subconceptType?.toLowerCase().startsWith("assignment")
    )
      fetchAssignment();
  }, [userData?.userId]);

  useEffect(() => {
    if (subconceptData?.subconceptType === "medium" || subconceptData?.subconceptType === "toastmasters") {
      setIsRedirecting(true);
      setRedirectCountdown(5);
    }
  }, [subconceptData]);

  useEffect(() => {
    if (redirectCountdown > 0) {
      const interval = setInterval(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (redirectCountdown === 0) {
      const opened = window.open(subconceptData?.subconceptLink, '_blank', 'noopener,noreferrer');
      setIsRedirecting(false);

      setTimeout(() => {
        if (!opened || opened.closed || typeof opened.closed == 'undefined') {
          setShowManualButton(true);
        }
      }, 1000);
    }
  }, [redirectCountdown]);

  useEffect(() => {
    if (showErrorPopup && errorCountdown > 0) {
      const interval = setInterval(() => {
        setErrorCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (errorCountdown <= 0) {
      setShowErrorPopup(false);
    }
  }, [showErrorPopup, errorCountdown]);

  useEffect(() => {
    if (
      subconceptData.subconceptType === "audio" ||
      subconceptData.subconceptType === "video" ||
      subconceptData.subconceptType === "assignment_audio" ||
      subconceptData.subconceptType === "assignment_video"
    ) {
      const contentElement = contentRef.current;
      //@ts-ignore
      contentElement.addEventListener("timeupdate", handleTimeUpdate);
      return () => {
        // @ts-ignore
        contentElement.removeEventListener("timeupdate", handleTimeUpdate);
      };
    }
  }, [subconceptData]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleTimeUpdate = () => {
    const contentElement = contentRef.current;
    // @ts-ignore
    const playedTime = contentElement.currentTime;
    // @ts-ignore
    const totalTime = contentElement.duration;
    const percentage = (playedTime / totalTime) * 100;
    setPlayedPercentage(percentage);

    if (percentage > 80 && isComplete) {
      setIsComplete(false);
    }
  };

  const handleComplete = () => {
    setIsComplete(true);

    if (
      subconceptData.subconceptType === "audio" ||
      subconceptData.subconceptType === "video" ||
      subconceptData.subconceptType === "assignment_audio" ||
      subconceptData.subconceptType === "assignment_video"
    ) {
      if (contentRef.current) {
        contentRef.current.pause();
      }
    }

    sendAttemptData(userData, subconceptData?.subconceptType);
  };

  const goToNext = (nextsubconcept) => {
    navigate(`/subconcept/${nextsubconcept?.subconceptId}`, {
      state: {
        subconcept: nextsubconcept,
        index: index + 1,
        subconcepts: subconceptsList,
        stageId: location.state?.stageId,
        currentUnitId: currentUnitId, 
        subconceptId : nextsubconcept?.subconceptId
      },
      replace: true
    });
  };

  const handleGoBack = () => {
    console.log(userData);
    navigate(`/subconcepts/${userData?.unitId}`);
  };

  const sendAttemptData = (userData, subconceptType) => {
    const finalScore =
      subconceptData?.subconceptType?.startsWith("assignment") ||
        subconceptData?.subconceptType?.startsWith("assessment")
        ? 0
        : subconceptData?.subconceptType === "video" ||
          subconceptData?.subconceptType === "audio"
          ? playedPercentage >= 80
            ? subconceptData?.subconceptMaxscore
            : 0
          : subconceptData?.subconceptMaxscore;

    setScorePercentage(
      subconceptData?.subconceptMaxscore == 0 ||
        ["assignment", "assessment"].some((type) =>
          subconceptData?.subconceptType?.toLowerCase().startsWith(type)
        )
        ? 100
        : (finalScore / subconceptData?.subconceptMaxscore) * 100
    );

    const date = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const ISTTime = new Date(date.getTime() + ISTOffset);
    const formattedISTTimestamp = ISTTime.toISOString().slice(0, 19);

    const payload = {
      userAttemptFlag: true,
      userAttemptScore: finalScore,
      userAttemptStartTimestamp: userData.userAttemptStartTimestamp,
      userAttemptEndTimestamp: formattedISTTimestamp,
      unitId: userData.unitId,
      programId: userData.programId,
      stageId: userData.stageId,
      userId: userData.userId,
      sessionId: userData.sessionId,
      subconceptId: userData.subconceptId,
      cohortId: userData.cohortId,
    };

    fetch(`${userData.API_BASE_URL}/user-attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Request failed");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Data sent successfully", data);
        // REMOVED THE CONDITION - Show success popup for ALL content types including video
        //setShowSuccessPopup(true);
        //setSuccessCountdown(3);
      })
      .catch((error) => {
        console.error("Error:", error);
        setShowErrorPopup(true);
        setErrorCountdown(5);
        setIsComplete(false);
      });
  };

  const sendAttemptDataWithoutModal = (userData, subconceptType) => {
  const finalScore =
    subconceptData?.subconceptType?.startsWith("assignment") ||
      subconceptData?.subconceptType?.startsWith("assessment")
      ? 0
      : subconceptData?.subconceptType === "video" ||
        subconceptData?.subconceptType === "audio"
        ? playedPercentage >= 80
          ? subconceptData?.subconceptMaxscore
          : 0
        : subconceptData?.subconceptMaxscore;

  const date = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ISTTime = new Date(date.getTime() + ISTOffset);
  const formattedISTTimestamp = ISTTime.toISOString().slice(0, 19);

  const payload = {
    userAttemptFlag: true,
    userAttemptScore: finalScore,
    userAttemptStartTimestamp: userData.userAttemptStartTimestamp,
    userAttemptEndTimestamp: formattedISTTimestamp,
    unitId: userData.unitId,
    programId: userData.programId,
    stageId: userData.stageId,
    userId: userData.userId,
    sessionId: userData.sessionId,
    subconceptId: userData.subconceptId,
    cohortId: userData.cohortId,
  };

  fetch(`${userData.API_BASE_URL}/user-attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Request failed");
      }
      return response.json();
    })
    .then((data) => {
      console.log("Data sent successfully", data);
      // Don't show success modal for auto-navigation
    })
    .catch((error) => {
      console.error("Error:", error);
      // Don't show error modal for auto-navigation
    });
  };

  const handleUploadSuccess = () => {
    setIsAssignmentUploadSuccesfull(true);
  };

  const renderContent = () => {
    const { subconceptType, subconceptLink } = subconceptData;
    switch (subconceptType) {
      case "medium":
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
            <div className="p-8 max-w-2xl w-full text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-8 h-8 text-emerald-600" />
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Medium Article
              </h2>

              {isRedirecting && redirectCountdown > 0 ? (
                <>
                  <p className="text-slate-600 mb-4 leading-relaxed">
                    Preparing to open article in new tab in {redirectCountdown} seconds...
                  </p>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                    <p className="text-emerald-700 font-medium">
                      Opening in {redirectCountdown} seconds...
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  </div>
                </>
              ) : showManualButton ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-amber-800 font-medium mb-2">
                      ⚠️ Popup was blocked by your browser
                    </p>
                    <p className="text-amber-700 text-sm">
                      Please click the button below to open the article manually.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      window.open(subconceptData?.subconceptLink, '_blank', 'noopener,noreferrer');
                      setShowManualButton(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg mb-4"
                  >
                    Open Article Manually
                  </button>

                  <p className="text-slate-600 text-sm leading-relaxed">
                    After reading the article, please click "Complete" when finished.
                  </p>
                </>
              ) : (
                <p className="text-slate-600 mb-8 leading-relaxed">
                  The article has been opened in a new tab. Please read it and click "Complete" when finished.
                </p>
              )}
            </div>
          </div>
        );
      case "toastmasters":
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
            <div className="p-8 max-w-2xl w-full text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic className="w-8 h-8 text-blue-600" />
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Toastmasters Content
              </h2>

              {isRedirecting && redirectCountdown > 0 ? (
                <>
                  <p className="text-slate-600 mb-4 leading-relaxed">
                    Preparing to open content in new tab in {redirectCountdown} seconds...
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-blue-700 font-medium">
                      Opening in {redirectCountdown} seconds...
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </>
              ) : showManualButton ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-amber-800 font-medium mb-2">
                      ⚠️ Popup was blocked by your browser
                    </p>
                    <p className="text-amber-700 text-sm">
                      Please click the button below to open the content manually.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      window.open(subconceptData?.subconceptLink, '_blank', 'noopener,noreferrer');
                      setShowManualButton(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg mb-4"
                  >
                    Open Toastmasters Content
                  </button>

                  <p className="text-slate-600 text-sm leading-relaxed">
                    After accessing the content, please click "Complete" when finished.
                  </p>
                </>
              ) : (
                <p className="text-slate-600 mb-8 leading-relaxed">
                  The content has been opened in a new tab. Please access it and click "Complete" when finished.
                </p>
              )}
            </div>
          </div>
        );
      case "audio":
      case "assignment_audio":
        return (
          <div className="relative w-full">
            <div className="flex items-center justify-center min-h-[300px] bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
              <audio
                key={subconceptData.subconceptId}
                ref={contentRef}
                controls
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                onEnded={() => {
                  setShowOverlay(true);
                  setProgress(0);
                  
                  const duration = 5000;
                  const interval = 50;
                  const steps = duration / interval;
                  let currentStep = 0;
                  
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                  
                  progressIntervalRef.current = setInterval(() => {
                    currentStep++;
                    setProgress((currentStep / steps) * 100);
                    
                    if (currentStep >= steps && nextsubconcept) {
                      clearInterval(progressIntervalRef.current);
                      setSubconceptData(nextsubconcept);
                      setCurrentIndex(currentIndex + 1);
                      setShowOverlay(false);
                      // For audio with next subconcept: send attempt data and navigate
                      sendAttemptDataWithoutModal(userData, subconceptData?.subconceptType);
                      goToNext(nextsubconcept);
                    }
                  }, interval);

                  if(!nextsubconcept) {
                    // Only call handleComplete when there's no next subconcept (shows modal)
                    handleComplete();
                  }
                }}
                className="w-full max-w-2xl h-[80px] bg-white border-2 border-slate-200 rounded-xl shadow-lg"
              >
                <source src={subconceptLink} type="audio/mp3" />
                Your browser does not support the audio element.
              </audio>
            </div>

            {/* Overlay - only shown when audio ends and there's a next subconcept */}
            {showOverlay && nextsubconcept && (
              <NextContentOverlay
                nextSubconcept={nextsubconcept}
                progress={progress}
                onReplay={() => {
                  setShowOverlay(false);
                  setProgress(0);
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                  if (contentRef.current) {
                    contentRef.current.currentTime = 0;
                    contentRef.current.play();
                  }
                }}
                onCancel={() => {
                  setShowOverlay(false);
                  setProgress(0);
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                }}
                onContinue={() => {
                  setShowOverlay(false);
                  setProgress(0);
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                  sendAttemptDataWithoutModal(userData, subconceptData?.subconceptType);
                  goToNext(nextsubconcept);
                }}
              />
            )}
          </div>
        );
      case "video":
      case "assignment_video":
        return (
          <div className="relative">
            <video
            key={subconceptData.subconceptId} // Add this key to force remount
              ref={contentRef}
              controls
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              onEnded={() => {
                setShowOverlay(true);
                setProgress(0);
                
                const duration = 5000;
                const interval = 50;
                const steps = duration / interval;
                let currentStep = 0;
                
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                }
                
                progressIntervalRef.current = setInterval(() => {
                  currentStep++;
                  setProgress((currentStep / steps) * 100);
                  
                  if (currentStep >= steps && nextsubconcept) {
                      clearInterval(progressIntervalRef.current);
                      // Update the subconcept data before navigating
                      setSubconceptData(nextsubconcept);
                      setCurrentIndex(currentIndex + 1);
                      setShowOverlay(false);
                      handleComplete(); // This triggers the modal
                      goToNext(nextsubconcept);
                    }
                }, interval);

                if(!nextsubconcept) {
                  handleComplete(); // This triggers the modal
                }
              }}
              className="border-2 border-slate-200 rounded-xl shadow-lg max-h-[60vh] bg-white w-full"
            >
              <source src={subconceptData?.subconceptLink} type="video/mp4" />
              Your browser does not support the video element.
            </video>

            {showOverlay && nextsubconcept && (
              <NextContentOverlay
                nextSubconcept={nextsubconcept}
                progress={progress}
                onReplay={() => {
                  setShowOverlay(false);
                  setProgress(0);
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                  if (contentRef.current) {
                    contentRef.current.currentTime = 0;
                    contentRef.current.play();
                  }
                }}
                onCancel={() => {
                  setShowOverlay(false);
                  setProgress(0);
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                }}
                onContinue={() => {
                  setShowOverlay(false);
                  setProgress(0);
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                  handleComplete(); // This triggers the modal
                }}
              />
            )}
          </div>
        );
      case "image":
      case "assignment_image":
        return (
          <div className="flex flex-col items-center">
            <img
              src={subconceptLink}
              alt="Image content"
              style={{
                maxWidth: "100%",
                borderRadius: "12px",
                boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                border: "2px solid #e2e8f0",
              }}
              onContextMenu={(e) => e.preventDefault()}
            />
            {subconceptData?.subconceptType === "assignment_image" && (
              <Button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = subconceptLink;
                  link.download = `assignment_${subconceptData?.subconceptId || 'image'}`;
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="mt-4 bg-[#f48d03] hover:bg-[#e67e00] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Download Assignment
              </Button>
            )}
          </div>
        );
      case "pdf":
      case "assignment_pdf":
        return (
          <div className="w-full">
            <PDFBrowserViewer
              pdfUrl={subconceptLink}
              onContentLoaded={() => {}}
            />
          </div>
        );
      case "pdfAsPpt":
        return (
          <div className="relative w-full">
            <PDFSlideViewer
              pdfUrl={subconceptLink}
              onContentLoaded={() => {}}
              onLastSlideReached={() => {
                if (nextsubconcept) {
                  setShowOverlay(true);
                  setProgress(0);
                  
                  const duration = 5000;
                  const interval = 50;
                  const steps = duration / interval;
                  let currentStep = 0;
                  
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                  
                  progressIntervalRef.current = setInterval(() => {
                    currentStep++;
                    setProgress((currentStep / steps) * 100);
                    
                    if (currentStep >= steps && nextsubconcept) {
                      clearInterval(progressIntervalRef.current);
                      setSubconceptData(nextsubconcept);
                      setCurrentIndex(currentIndex + 1);
                      setShowOverlay(false);
                      sendAttemptDataWithoutModal(userData, subconceptData?.subconceptType);
                      goToNext(nextsubconcept);
                    }
                  }, interval);
                } else {
                  // No next subconcept - show completion modal
                  handleComplete();
                }
              }}
            />

            {/* Overlay - only shown when last slide is reached and there's a next subconcept */}
            {showOverlay && nextsubconcept && (
              <NextContentOverlay
                nextSubconcept={nextsubconcept}
                progress={progress}
                onReplay={() => {
                  debugger;
                  setShowOverlay(false);
                  setProgress(0);
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                }}
                onCancel={() => {
                  setShowOverlay(false);
                  setProgress(0);
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                }}
                onContinue={() => {
                  setShowOverlay(false);
                  setProgress(0);
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                  sendAttemptDataWithoutModal(userData, subconceptData?.subconceptType);
                  goToNext(nextsubconcept);
                }}
              />
            )}
          </div>
        );
      case "youtube":
      case "ted":
        return (
          <div
            onContextMenu={(e) => e.preventDefault()}
            className={`${(subconceptData?.subconceptType?.toLowerCase() === "youtube" ||
                subconceptData?.subconceptType?.toLowerCase() === "ted") &&
              "w-11/12"
              } iframe-wrapper w-full`}
            style={{ position: "relative" }}
          >
            <iframe
              className="h-[calc(100vh-300px)]"
              src={
                subconceptData?.subconceptType?.toLowerCase() === "ted"
                  ? subconceptLink
                  : `${subconceptLink}#toolbar=0`
              }
              width="100%"
              title={
                subconceptData?.subconceptType?.toLowerCase() === "ted"
                  ? "TED Talk"
                  : subconceptData?.subconceptType?.toLowerCase() === "youtube"
                    ? "YouTube Video"
                    : "PDF Document"
              }
              style={{
                borderRadius: "12px",
                boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                border: "2px solid #e2e8f0",
              }}
              frameBorder="0"
              allowFullScreen={subconceptData?.subconceptType?.toLowerCase() === "ted"}
            />
          </div>
        );
      case "assessment":
        const updatedUrl = appendParamsToUrl(
          subconceptData?.subconceptLink,
          userData?.userId,
          userData?.cohortId
        );
        return (
          <iframe
            src={updatedUrl}
            width="100%"
            height="600px"
            title="PDF Document"
            style={{
              borderRadius: "12px",
              boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              border: "2px solid #e2e8f0",
            }}
          />
        );
      default:
        return <p>Something went wrong!</p>;
    }
  };

  return (
    <>
      <AssignmentStatusModal
        isOpen={isAssignmentStatusModalOpen}
        onClose={() => setIsAssignmentStatusModalOpen(false)}
        assignment={
          currentStatus === "not_corrected"
            ? assignmentData.not_corrected
            : currentStatus === "corrected"
              ? assignmentData.corrected
              : assignmentData.corrected_with_file
        }
        subconceptMaxscore={subconceptData?.subconceptMaxscore}
      />

      {showSuccessPopup && (
        <ActivityCompletionModal
          countdownDuration={3}
          onClose={() => {
            setShowSuccessPopup(false);
            handleGoBack(); // Navigate back after modal closes
          }}
          scorePercentage={
            ["assignment", "assessment"].some((type) =>
              subconceptData?.subconceptType?.toLowerCase().startsWith(type)
            )
              ? 100
              : scorePercentage || 0
          }
        />
      )}
      
      {showErrorPopup && (
        <ActivityCompletionModal
          countdownDuration={3}
          onClose={() => setShowErrorPopup(false)}
          scorePercentage={0}
        />
      )}

      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-center font-sans text-gray-800 w-full fixed">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-slate-100/30 z-0" />

        <h1 className="relative z-10 pt-6 text-2xl md:text-3xl lg:text-4xl font-semibold bg-gradient-to-r from-[#f48d03] to-[#e67e00] bg-clip-text text-transparent">
          {subconceptData?.subconceptType === "video" ||
            subconceptData?.subconceptType === "youtube"
            ? "Watch the video"
            : subconceptData?.subconceptType === "ted"
              ? "Watch the TED talk"
              : subconceptData?.subconceptType === "medium"
                ? "Read the article"
                : subconceptData?.subconceptType === "toastmasters"
                  ? "Access Toastmasters content"
                  : subconceptData?.subconceptType === "audio"
                    ? "Listen to the audio"
                    : subconceptData?.subconceptType === "pdf"
                      ? "Read the PDF"
                      : subconceptData?.subconceptType === "image"
                        ? "Observe the image"
                        : `Complete ${subconceptData?.subconceptType.startsWith("assignment")
                          ? "your assignment"
                          : subconceptData?.subconceptType.startsWith("assessment")
                            ? "the assessment"
                            : "the activity"
                        }`}
        </h1>

        <div
          id="contentArea"
          className={`relative z-10 mb-6 mt-4 mx-auto p-4 sm:p-6 md:pb-24 flex justify-center items-start overflow-y-auto max-h-[calc(100vh-200px)] no-scrollbar
    ${["assessment", "video", "assignment_video", "youtube", "ted"].includes(
            subconceptData?.subconceptType
          )
              ? "w-11/12 flex justify-center items-center bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200"
              : subconceptData?.subconceptType === "pdf" ||
                subconceptData?.subconceptType === "assignment_pdf" ||
                subconceptData?.subconceptType === "pdfAsPpt"
                ? "w-full px-2"
                : "w-11/12 max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200"
            }`}
        >
          {renderContent()}
        </div>

        <div
          className="fixed bottom-0 left-0 w-full z-10 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex-col flex justify-center gap-2 flex-wrap p-1 shadow-2xl before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-1 before:bg-gradient-to-b before:from-slate-300 before:to-transparent before:rounded-t-md"
        >
          {subconceptData?.subconceptType === "assessment" && (
            <div className="flex justify-center items-center space-x-2 py-1">
              <input
                type="checkbox"
                id="agreement"
                checked={isAssessmentIntegrityChecked}
                onChange={(e) =>
                  setIsAssessmentIntegrityChecked(e.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor="agreement" className="text-sm text-gray-700 py-1">
                I agree that I have submitted the Google Form response for this
                activity.
              </label>
            </div>
          )}
          <div className="flex items-center justify-between sm:justify-center py-2 px-2 sm:gap-20">
            {subconceptData?.subconceptType.startsWith("assignment") ? (
              subconceptData?.completionStatus === "ignored" ? (
                <FileUploaderRecorder onUploadSuccess={handleUploadSuccess} />
              ) : (
                <Button
                  onClick={() => setIsAssignmentStatusModalOpen(true)}
                  disabled={isAssignmentStatusModalOpen}
                  className="bg-[#f48d03] hover:bg-[#e67e00] text-white rounded-lg font-medium transition-all duration-200 shadow-md"
                >
                  View Assignment status
                </Button>
              )
            ) : (
                  <Button
                    onClick={() => {
                      if (subconceptData?.subconceptType.startsWith("assignment")) {
                        setIsUploadModalOpen(true);
                      } else {
                        // For non-assignment types, complete current and navigate to next
                        if (nextsubconcept) {
                          // Send attempt data and navigate to next subconcept
                          sendAttemptDataWithoutModal(userData, subconceptData?.subconceptType);
                          goToNext(nextsubconcept);
                        } else {
                          // If no next subconcept, just complete (shows modal)
                          handleComplete();
                        }
                      }
                    }}
                    disabled={
                      subconceptData?.subconceptType.startsWith("assessment")
                        ? !isAssessmentIntegrityChecked
                        : isComplete
                    }
                    className={`${(subconceptData?.subconceptType.startsWith("assessment") &&
                        !isAssessmentIntegrityChecked) ||
                        isComplete
                        ? "bg-slate-400 cursor-not-allowed"
                        : "bg-[#f48d03] hover:bg-[#e67e00]"
                      } text-white px-3 py-2 sm:px-4 sm:py-3 m-1 sm:m-2 rounded-lg text-sm sm:text-base md:text-lg font-medium transition-all duration-200 max-w-[150px] sm:max-w-[200px] shadow-md`}
                  >
                    {subconceptData?.subconceptType
                      ?.toLowerCase()
                      .startsWith("assignment")
                      ? "Upload assignment"
                      : nextsubconcept ? "Next Module" : "Complete"}
                  </Button>
            )}

            <Button
              onClick={handleGoBack}
              className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base md:text-lg font-medium max-w-[150px] sm:max-w-[200px] rounded-lg shadow-md transition-all duration-200"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MediaContent;