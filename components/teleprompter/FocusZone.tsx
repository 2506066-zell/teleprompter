'use client';

import React, {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import {
  Chunk,
  TeleprompterSettings,
  DynamicCaptionMode,
  PronunciationFeedback,
  WordHighlightStatus,
} from '@/types/teleprompter';
import { AdaptivePacingEngine } from '@/lib/engine/adaptivePacingEngine';
import { Check, X } from 'lucide-react';

interface FocusZoneProps {
  chunks: Chunk[];
  currentIndex: number;
  activeWordIndex?: number;
  predictedWordIndex?: number | null;
  predictedChunkIndex?: number | null;
  highlightStatus?: WordHighlightStatus;
  captionMode?: DynamicCaptionMode;
  settings: TeleprompterSettings;
  pronunciationFeedback?: PronunciationFeedback;
  onSkipCorrection?: () => void;
  onClearPronunciationFeedback?: () => void;
  onSelectChunk?: (index: number) => void;
  isLandscape?: boolean;
  debugMode?: boolean;
  onToggleDebugMode?: () => void;
  cognitiveState?: string;
  recoveryState?: string;
  speechWPM?: number;
  smoothedWPM?: number;
  confidence?: number;
  matchingScore?: number;
}

export const FocusZone: React.FC<FocusZoneProps> = ({
  chunks,
  currentIndex,
  activeWordIndex = 0,
  predictedWordIndex = null,
  predictedChunkIndex = null,
  highlightStatus = 'confirmed',
  captionMode = 'word_follow',
  settings,
  pronunciationFeedback,
  onSkipCorrection,
  onClearPronunciationFeedback,
  onSelectChunk,
  isLandscape = false,
  debugMode: externalDebugMode,
  onToggleDebugMode,
  cognitiveState = 'READY',
  recoveryState = 'CONFIDENT',
  speechWPM = 140,
  smoothedWPM = 140,
  confidence = 0,
  matchingScore = 0,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const chunkRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Debug HUD state (keyboard 'D' or external toggle)
  const [internalDebugHUD, setInternalDebugHUD] = useState(false);
  const isDebugActive = externalDebugMode !== undefined ? externalDebugMode : internalDebugHUD;

  const [fps, setFps] = useState(60);
  const [debugMetrics, setDebugMetrics] = useState({
    currentOffset: 0,
    targetOffset: 0,
    delta: 0,
    activeChunk: currentIndex,
    activeWord: activeWordIndex,
  });

  const [viewportHeight, setViewportHeight] = useState(800);

  // Cached geometry
  const cachedOffsetsRef = useRef<number[]>([]);
  const geometryLockedRef = useRef(false);

  // Continuous position state (numeric values for continuous rAF interpolation)
  const currentOffsetRef = useRef<number>(0);
  const targetOffsetRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(performance.now());

  // Focus Zone target Y position on the screen
  // Lens proximity places the active reading line at ~34% of screen (closer to top camera)
  const focusZoneY = useMemo(() => {
    const ratio =
      settings.focusPosition === 'lens_proximity'
        ? isLandscape
          ? 0.26
          : 0.34
        : 0.48;
    return Math.round(viewportHeight * ratio);
  }, [viewportHeight, settings.focusPosition, isLandscape]);

  // Maximum width constrained for optimal reading column width (18-25 chars per line)
  const maxLineConstraint =
    settings.lineLength === 'compact'
      ? 'max-w-[300px]'
      : settings.lineLength === 'wide'
      ? 'max-w-xl'
      : 'max-w-[340px] sm:max-w-[380px]';

  // Strict Uniform Font Size: Every chunk in the continuous stream shares the EXACT same
  // font size and line-height so geometry never reflows when focus changes
  const activeFontSize = Math.min(42, Math.max(28, settings.fontSize));
  const lockedLineHeight = 1.28;

  // Toggle debug with keyboard 'D' or 'd'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
          if (onToggleDebugMode) {
            onToggleDebugMode();
          } else {
            setInternalDebugHUD((prev) => !prev);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleDebugMode]);

  // 1. GEOMETRY PRE-COMPUTATION & LOCKING
  // Measured on mount, chunks change, window resize, orientation change, or font size change.
  // During playback, ZERO DOM measurements are made. Target offset is an O(1) array lookup.
  const measureGeometry = useCallback(() => {
    if (!viewportRef.current || !contentRef.current) return;

    const vHeight = viewportRef.current.clientHeight;
    setViewportHeight(vHeight);

    // Compute chunk offsets relative to the continuous content stream
    const offsets: number[] = [];
    chunkRefs.current.forEach((el) => {
      if (el) {
        offsets.push(el.offsetTop);
      }
    });

    cachedOffsetsRef.current = offsets;
    geometryLockedRef.current = true;

    // Recalculate target offset for current index
    const target = Math.max(0, (offsets[currentIndex] || 0) - focusZoneY);
    targetOffsetRef.current = target;
  }, [currentIndex, focusZoneY]);

  // Measure on layout / resize / orientation change
  useLayoutEffect(() => {
    measureGeometry();
  }, [measureGeometry, chunks, settings.fontSize, settings.lineLength, isLandscape]);

  useEffect(() => {
    const handleResize = () => {
      measureGeometry();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [measureGeometry]);

  // 2. VIEWPORT TARGET POSITION UPDATE
  // When active chunk changes, compute new target offset.
  // DO NOT snap currentOffset = targetOffset! The rAF loop will smoothly glide toward it.
  useEffect(() => {
    if (cachedOffsetsRef.current.length > currentIndex) {
      const chunkTop = cachedOffsetsRef.current[currentIndex] ?? 0;
      const target = Math.max(0, chunkTop - focusZoneY);
      targetOffsetRef.current = target;
    }
  }, [currentIndex, focusZoneY]);

  // 3. CONTINUOUS READING POSITION ENGINE (60 FPS requestAnimationFrame)
  // Critically damped exponential smoothing:
  // currentOffset += (targetOffset - currentOffset) * (1 - Math.exp(-lambda * dt))
  // Frame-rate independent, zero teleportation, zero spring bounce, zero overshoot.
  useEffect(() => {
    let rafId: number;
    lastTimeRef.current = performance.now();
    fpsTimerRef.current = performance.now();
    frameCountRef.current = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.08); // max 80ms clamp
      lastTimeRef.current = now;

      // FPS tracking for debug HUD
      frameCountRef.current += 1;
      if (now - fpsTimerRef.current >= 500) {
        const calculatedFps = Math.round(
          (frameCountRef.current * 1000) / (now - fpsTimerRef.current)
        );
        setFps(calculatedFps);
        frameCountRef.current = 0;
        fpsTimerRef.current = now;
      }

      const target = targetOffsetRef.current;
      const current = currentOffsetRef.current;
      const diff = target - current;

      // Distance-aware continuous transit (180ms - 450ms)
      if (Math.abs(diff) > 0.05) {
        const movementDuration = AdaptivePacingEngine.calculateMovementDuration(diff);
        const lambda = AdaptivePacingEngine.calculateSmoothingLambda(movementDuration);
        const smoothing = 1 - Math.exp(-lambda * dt);
        const next = current + diff * smoothing;
        currentOffsetRef.current = next;

        if (contentRef.current) {
          contentRef.current.style.transform = `translate3d(0, -${next}px, 0)`;
        }
      } else if (current !== target) {
        currentOffsetRef.current = target;
        if (contentRef.current) {
          contentRef.current.style.transform = `translate3d(0, -${target}px, 0)`;
        }
      }

      // Update debug state periodically (approx 10Hz to avoid state thrashing)
      if (isDebugActive && Math.random() < 0.15) {
        setDebugMetrics({
          currentOffset: Math.round(currentOffsetRef.current),
          targetOffset: Math.round(targetOffsetRef.current),
          delta: Math.round(target - currentOffsetRef.current),
          activeChunk: currentIndex,
          activeWord: activeWordIndex,
        });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [currentIndex, activeWordIndex, isDebugActive]);

  const mirrorStyle = settings.mirrorMode ? { transform: 'scaleX(-1)' } : undefined;

  return (
    <div
      ref={viewportRef}
      className="relative w-full h-full overflow-hidden select-none font-sans"
      style={mirrorStyle}
    >
      {/* 
        DEVELOPMENT COGNITIVE TELEMETRY HUD (Press 'D' to toggle)
        Visualizes Focus Zone line, continuous offsets, target, WPM, states, and 60 FPS performance
      */}
      {isDebugActive && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {/* Cyan Focus Rail Line */}
          <div
            className="absolute inset-x-0 border-b border-cyan-400/80 border-dashed"
            style={{ top: `${focusZoneY}px` }}
          >
            <span className="absolute right-4 -top-5 text-[10px] font-mono text-cyan-300 bg-black/80 px-2 py-0.5 rounded border border-cyan-500/40">
              FOCUS RAIL ({focusZoneY}px)
            </span>
          </div>

          {/* HUD Metrics Panel */}
          <div className="absolute top-16 right-4 bg-black/90 border border-cyan-500/40 rounded-xl p-3 text-[11px] font-mono text-cyan-200 shadow-2xl space-y-1 max-w-xs">
            <div className="text-[10px] font-bold text-white uppercase tracking-wider border-b border-cyan-500/30 pb-1">
              Cognitive Engine Telemetry
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-400">Cognitive State:</span>
              <span className="text-emerald-400 font-semibold">{cognitiveState}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-400">Recovery:</span>
              <span className="text-cyan-300 font-semibold">{recoveryState}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-400">Speech WPM:</span>
              <span className="text-white font-semibold">
                {speechWPM} <span className="text-neutral-400 text-[10px]">({smoothedWPM} avg)</span>
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-400">Confidence:</span>
              <span className="text-emerald-400 font-semibold">{Math.round(confidence * 100)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-400">Active Token:</span>
              <span className="text-white font-semibold">
                P{currentIndex + 1} • W{activeWordIndex}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-400">Predicted Next:</span>
              <span className="text-cyan-300 font-semibold">
                {predictedWordIndex !== null ? `W${predictedWordIndex}` : 'None'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-400">Offset / Target:</span>
              <span className="text-white font-semibold">
                {debugMetrics.currentOffset} / {debugMetrics.targetOffset}px
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-400">Delta / FPS:</span>
              <span className="text-amber-300 font-semibold">
                {debugMetrics.delta}px • <span className={fps >= 55 ? 'text-emerald-400' : 'text-amber-400'}>{fps} FPS</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/*
        CONTINUOUS DOCUMENT STREAM ("FILM-ROLL" ARCHITECTURE)
        - All chunks (0..N) are rendered in a single contiguous document.
        - Text geometry is locked (no remounting, no slot swapping, zero reflow).
        - The container is smoothly translated via translate3d() on every rAF tick.
      */}
      <div
        ref={contentRef}
        className={`relative w-full ${maxLineConstraint} mx-auto text-left px-5 sm:px-8 space-y-8 will-change-transform`}
        style={{
          paddingTop: `${focusZoneY}px`,
          paddingBottom: `${Math.round(viewportHeight * 0.65)}px`,
        }}
      >
        {chunks.map((chunk, idx) => {
          const distance = idx - currentIndex;
          const isActive = distance === 0;
          const isImmediatePrev = distance === -1;
          const isFarPrev = distance < -1;
          const isImmediateNext = distance === 1;

          const opacity = isActive
            ? 1.0
            : isImmediatePrev
            ? 0.65
            : isFarPrev
            ? 0.35
            : isImmediateNext
            ? 0.35
            : 0.20;

          const textColor = isActive
            ? 'text-[#F5F7FA]'
            : isImmediatePrev
            ? 'text-[#D1D5DB]'
            : 'text-[#A1A7B3]';

          const words = chunk.text.split(/\s+/).filter(Boolean);
          const importantTerms = chunk.importantWords || [];

          return (
            <div
              key={chunk.id}
              ref={(el) => {
                chunkRefs.current[idx] = el;
              }}
              onClick={() => onSelectChunk && onSelectChunk(chunk.order)}
              className={`transition-opacity duration-300 ease-out cursor-pointer ${textColor}`}
              style={{
                opacity,
              }}
            >
              <p
                className="tracking-[-0.015em] font-semibold antialiased leading-[1.28]"
                style={{
                  fontSize: `${activeFontSize}px`,
                  lineHeight: lockedLineHeight,
                }}
              >
                {isActive && captionMode === 'word_follow' ? (
                  /* Active Phrase with Zero-Reflow Soft Emerald Pill & Predictive Support */
                  <span className="inline leading-[1.32]">
                    {words.map((word, wIdx) => {
                      const isWordActive = wIdx === activeWordIndex;
                      const isWordPredicted =
                        wIdx === predictedWordIndex &&
                        !isWordActive &&
                        highlightStatus === 'predicted';
                      const isWordPast = wIdx < activeWordIndex;
                      const isWordImportant = importantTerms.some(
                        (t) =>
                          t.toLowerCase() ===
                          word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
                      );

                      return (
                        <span
                          key={wIdx}
                          className={`inline-block px-2 py-0.5 my-0.5 mx-0.5 rounded-lg border font-semibold transition-colors duration-200 ease-out ${
                            isWordActive
                              ? 'bg-emerald-500/25 border-emerald-400/40 text-[#86EFAC]'
                              : isWordPredicted
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-[#86EFAC]/70'
                              : isWordPast
                              ? 'bg-transparent border-transparent text-[#F5F7FA] opacity-95'
                              : 'bg-transparent border-transparent text-[#F5F7FA] opacity-90'
                          } ${
                            isWordImportant && !isWordActive
                              ? 'underline decoration-emerald-500/40 underline-offset-4'
                              : ''
                          }`}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  /* Context Phrases: Clean frozen text with identical token spacing */
                  <span className="inline leading-[1.32]">
                    {words.map((word, wIdx) => (
                      <span
                        key={wIdx}
                        className="inline-block px-2 py-0.5 my-0.5 mx-0.5 rounded-lg border border-transparent font-semibold"
                      >
                        {word}
                      </span>
                    ))}
                  </span>
                )}

                {/* Natural punctuation pause indicator for active chunk */}
                {isActive && /[.!?]$/.test(chunk.text) && (
                  <span className="inline-block ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400/70 align-middle" />
                )}
              </p>
            </div>
          );
        })}

        {chunks.length > 0 && (
          <div className="pt-6 pb-2 text-[#6B7280] text-[10px] font-mono tracking-widest uppercase">
            — Akhir Naskah —
          </div>
        )}

        {chunks.length === 0 && (
          <p className="text-[#6B7280] font-normal text-sm tracking-wide font-mono">
            — Menyiapkan naskah... —
          </p>
        )}
      </div>

      {/*
        FLOATING PRONUNCIATION MICRO-FEEDBACK OVERLAY
        Rendered as an absolute floating card above the background.
        Zero layout push on the continuous text stream!
      */}
      {pronunciationFeedback && pronunciationFeedback.status !== 'none' && (
        <div
          className="absolute inset-x-0 z-30 flex justify-center pointer-events-none px-4 transition-all duration-200"
          style={{ top: `${focusZoneY + 160}px` }}
        >
          <div className="pointer-events-auto">
            {pronunciationFeedback.status === 'correct' ? (
              <div className="bg-[#131722]/95 border border-emerald-500/40 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-xs min-w-[240px] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2.5">
                  <div className="p-1 bg-emerald-950/80 text-emerald-400 rounded-lg border border-emerald-500/30">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <div className="text-[#F5F7FA] font-semibold text-xs">
                      {pronunciationFeedback.targetWord}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      Pengucapan jelas • Lanjut...
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#131722]/95 border border-white/15 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-xs min-w-[260px] max-w-sm animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-rose-950/60 text-rose-400 rounded-lg border border-rose-500/30">
                    <div className="flex items-center gap-0.5 h-3.5">
                      <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-pulse" />
                      <span className="w-0.5 h-3.5 bg-rose-400 rounded-full" />
                      <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-pulse" />
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-[#F5F7FA] font-semibold text-xs flex items-center gap-1.5">
                      <span className="text-rose-400 line-through opacity-80 text-[11px]">
                        {pronunciationFeedback.detectedWord || '...'}
                      </span>
                      <span className="text-[#F5F7FA] font-bold">
                        {pronunciationFeedback.targetWord}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#A1A7B3]">
                      {pronunciationFeedback.status === 'unclear'
                        ? 'Kurang jelas — coba ulangi'
                        : `Coba ulangi: ${pronunciationFeedback.targetWord}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {pronunciationFeedback.allowSkip && onSkipCorrection && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSkipCorrection();
                      }}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-[#1F242A] hover:bg-[#2A2E34] text-neutral-200 rounded-lg transition border border-white/10"
                      title="Lewati kata ini"
                    >
                      Lanjut →
                    </button>
                  )}

                  {onClearPronunciationFeedback && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearPronunciationFeedback();
                      }}
                      className="p-1 text-[#6B7280] hover:text-[#F5F7FA] transition rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
