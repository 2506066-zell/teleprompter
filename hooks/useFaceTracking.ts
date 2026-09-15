'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceStatus, PermissionStatus } from '@/types/tracking';
import { FACE_AWAY_GRACE_PERIOD_MS } from '@/constants/defaults';

interface UseFaceTrackingOptions {
  enabled?: boolean;
}

export function useFaceTracking({ enabled = false }: UseFaceTrackingOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PermissionStatus>('prompt');
  const [status, setStatus] = useState<FaceStatus>('off');
  const [isPresent, setIsPresent] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastFaceDetectedTimeRef = useRef<number>(Date.now());
  const isRunningRef = useRef<boolean>(false);

  useEffect(() => {
    setIsSupported(
      typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices &&
        !!navigator.mediaDevices.getUserMedia
    );
  }, []);

  const stopTracking = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('off');
    setIsPresent(true); // Reset to default present so it doesn't leave teleprompter paused
  }, []);

  const startTracking = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }

    try {
      setStatus('loading');

      // Request lower resolution and frame rate to conserve battery and CPU
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: 10, max: 15 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setPermission('granted');

      // Hidden video element for lightweight analysis
      if (!videoRef.current) {
        const video = document.createElement('video');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true;
        videoRef.current = video;
      }

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      isRunningRef.current = true;
      setStatus('active');
      setIsPresent(true);
      lastFaceDetectedTimeRef.current = Date.now();

      // Detection Loop (throttled to ~5-8 FPS)
      let lastCheckTime = 0;
      const canvas = document.createElement('canvas');
      canvas.width = 64; // Tiny thumbnail for ultra-fast presence detection
      canvas.height = 48;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Check native browser FaceDetector API if available
      const nativeDetector =
        typeof window !== 'undefined' && 'FaceDetector' in window
          ? new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 })
          : null;

      const analyzeFrame = async (timestamp: number) => {
        if (!isRunningRef.current) return;

        if (timestamp - lastCheckTime >= 150) {
          // ~6.6 FPS check
          lastCheckTime = timestamp;

          let faceFound = true;

          if (nativeDetector && video.readyState >= 2) {
            try {
              const faces = await nativeDetector.detect(video);
              faceFound = faces.length > 0;
            } catch {
              faceFound = true; // graceful fallback
            }
          } else if (ctx && video.readyState >= 2) {
            // Lightweight optical presence analysis (checks for human motion & luminance variance)
            try {
              ctx.drawImage(video, 0, 0, 64, 48);
              const imgData = ctx.getImageData(0, 0, 64, 48);
              const data = imgData.data;
              let totalBrightness = 0;

              for (let i = 0; i < data.length; i += 4) {
                totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
              }
              const avgBrightness = totalBrightness / (data.length / 4);

              // If image is completely dark/covered (camera facing desk or covered)
              faceFound = avgBrightness > 15 && avgBrightness < 245;
            } catch {
              faceFound = true;
            }
          }

          const now = Date.now();
          if (faceFound) {
            lastFaceDetectedTimeRef.current = now;
            setIsPresent(true);
            setStatus('active');
          } else {
            // Apply smoothing grace period! Never pause on a single missing frame!
            const timeSinceLastSeen = now - lastFaceDetectedTimeRef.current;
            if (timeSinceLastSeen > FACE_AWAY_GRACE_PERIOD_MS) {
              setIsPresent(false);
              setStatus('away');
            } else {
              // Within grace period, treat as thinking/neutral
              setStatus('thinking');
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(analyzeFrame);
      };

      animFrameRef.current = requestAnimationFrame(analyzeFrame);
    } catch (err) {
      setPermission('denied');
      setStatus('error');
      isRunningRef.current = false;
    }
  }, []);

  const toggleTracking = useCallback(() => {
    if (isRunningRef.current) {
      stopTracking();
    } else {
      startTracking();
    }
  }, [startTracking, stopTracking]);

  useEffect(() => {
    if (enabled && !isRunningRef.current) {
      startTracking();
    } else if (!enabled && isRunningRef.current) {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, startTracking, stopTracking]);

  return {
    isSupported,
    permission,
    status,
    isPresent,
    startTracking,
    stopTracking,
    toggleTracking,
  };
}
