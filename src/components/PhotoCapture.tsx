"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, RotateCw, X } from "lucide-react";
import { createPortal } from "react-dom";

interface PhotoCaptureProps {
  onCapture: (imageBlob: Blob, type: "photo") => void;
  onClose: () => void;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onCapture,
  onClose,
}) => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isFrontCamera]);

  const startCamera = async () => {
    setIsLoading(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: { facingMode: isFrontCamera ? "user" : "environment" },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraReady(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setIsCameraReady(false);
    } finally {
      setIsLoading(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob(
          (blob) => {
            if (blob) {
              onCapture(blob, "photo");
            }
          },
          "image/jpeg",
          0.9
        );
      }
    }
  };

  const toggleCamera = () => {
    setIsFrontCamera((prev) => !prev);
    setIsCameraReady(false);
  };

  // ✅ Using Portal so modal always renders at <body> level
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
      <div className="relative w-full max-w-lg flex flex-col items-center justify-center p-4">
        <video ref={videoRef} className="w-full h-auto rounded-lg" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}

        {/* Buttons */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center space-x-10">
          {/* Capture */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={capturePhoto}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-white/40 hover:bg-white/50 backdrop-blur-md transition"
            disabled={!isCameraReady}
          >
            <Camera size={28} className="text-white" />
          </motion.button>

          {/* Switch */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleCamera}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-white/40 hover:bg-white/50 backdrop-blur-md transition"
          >
            <RotateCw size={28} className="text-white" />
          </motion.button>
        </div>

        {/* Close button (pushed inward, no background) */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white hover:text-gray-300 transition"
        >
          <X size={30} />
        </button>
      </div>
    </div>,
    document.body
  );
};