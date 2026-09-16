'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Chunk } from '@/types/teleprompter';
import { createReadingChunks } from '@/lib/script/chunking';
import { useTeleprompterEngine } from '@/hooks/useTeleprompterEngine';
import { useOrientation } from '@/hooks/useOrientation';
import { FocusZone } from '@/components/teleprompter/FocusZone';
import { TeleControls } from '@/components/teleprompter/TeleControls';
import { AtmosphericBackdrop } from '@/components/teleprompter/AtmosphericBackdrop';
import { ArrowLeft, Settings } from 'lucide-react';
import { SAMPLE_SCRIPTS } from '@/constants/defaults';

export default function TeleprompterPage() {
  const params = useParams();
  const scriptId = params.scriptId as string;

  const [scriptTitle, setScriptTitle] = useState('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { isLandscape, orientation } = useOrientation();
  const supabaseConfigured = isSupabaseConfigured();

  // Load script and chunks
  useEffect(() => {
    async function loadTeleprompterData() {
      if (!scriptId) return;
      setIsLoading(true);

      const loadFromLocal = () => {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('focus_tp_demo_scripts');
          const scripts = stored ? JSON.parse(stored) : [];
          const found = scripts.find((s: any) => s.id === scriptId);

          if (found) {
            setScriptTitle(found.title);
            setChunks(createReadingChunks(found.raw_text, orientation));
            return;
          }
        }
        const sample = SAMPLE_SCRIPTS[0];
        setScriptTitle(sample.title);
        setChunks(createReadingChunks(sample.text, orientation));
      };

      if (!supabaseConfigured) {
        loadFromLocal();
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: scriptData, error: scriptError } = await supabase
          .from('scripts')
          .select('*')
          .eq('id', scriptId)
          .single();

        if (!scriptError && scriptData) {
          setScriptTitle(scriptData.title);

          const { data: chunkData } = await supabase
            .from('script_chunks')
            .select('*')
            .eq('script_id', scriptId)
            .order('chunk_order', { ascending: true });

          if (chunkData && chunkData.length > 0) {
            setChunks(
              chunkData.map((c) => ({
                id: c.id,
                order: c.chunk_order,
                text: c.text,
                wordCount: c.word_count,
                complexityScore: Number(c.complexity_score),
                emphasisLevel: Number(c.emphasis_level),
                estimatedDuration: Number(c.estimated_duration),
              }))
            );
          } else {
            setChunks(createReadingChunks(scriptData.raw_text, orientation));
          }
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Teleprompter Supabase fetch error, falling back to local:', err);
      }

      // Universal fallback if Supabase table is missing or script not found in cloud
      loadFromLocal();
      setIsLoading(false);
    }

    loadTeleprompterData();
  }, [scriptId, orientation, supabaseConfigured]);

  const engine = useTeleprompterEngine({
    chunks,
    initialSettings: {
      fontSize: isLandscape ? 38 : 32,
      focusPosition: 'lens_proximity',
      captionMode: 'word_follow',
      mode: 'voice_follow',
    },
  });

  // When initial chunks load, jump to chunk 2 if it's sample script 01 so user sees the active chunk from screenshot immediately
  const initializedChunkRef = useRef(false);
  useEffect(() => {
    if (!initializedChunkRef.current && chunks.length >= 3 && scriptTitle === 'Script 01') {
      initializedChunkRef.current = true;
      engine.goToChunk(2, 'INITIAL_PREVIEW');
    }
  }, [chunks, scriptTitle, engine]);

  // Auto-hide controls logic: hide after 3 seconds of playing; show immediately on touch or pause
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (engine.playbackState === 'playing') {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [engine.playbackState]);

  useEffect(() => {
    if (engine.playbackState === 'playing') {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2500);
    } else {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [engine.playbackState]);

  const toggleFullscreen = async () => {
    if (typeof document === 'undefined') return;

    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#070A0F] flex items-center justify-center text-xs font-mono text-[#6B7280]">
        Menyiapkan instrumen baca...
      </main>
    );
  }

  const isVoiceActive =
    engine.settings.mode === 'voice_follow' || engine.settings.mode === 'adaptive';

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      className="relative w-screen h-screen min-h-[100dvh] bg-[#070A0F] text-[#F5F7FA] flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* 0. Scenic Atmospheric Twilight Backdrop */}
      <AtmosphericBackdrop />

      {/* 1. Minimal Top Bar: ← Script 01 ... ● VOICE  ⚙ */}
      <header
        className={`relative z-30 px-5 pt-4 pb-2 sm:px-8 sm:pt-5 flex items-center justify-between transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <Link
          href={`/editor/${scriptId}`}
          className="flex items-center gap-2.5 text-sm sm:text-base font-semibold text-white hover:text-white/80 transition tracking-tight"
          title="Kembali ke Editor"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
          <span className="truncate max-w-[200px] sm:max-w-xs">{scriptTitle || 'Script 01'}</span>
        </Link>

        {/* Top Right: ● VOICE pill + Settings Gear */}
        <div className="flex items-center gap-2.5">
          <div className="bg-[#0A261A]/90 border border-emerald-500/40 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm backdrop-blur-md">
            <span
              className={`w-2 h-2 rounded-full ${
                engine.playbackState !== 'playing'
                  ? 'bg-emerald-500'
                  : engine.cognitiveState === 'speaking'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="text-[10px] font-bold text-emerald-400 tracking-wider">
              {engine.settings.mode === 'voice_follow'
                ? 'VOICE'
                : engine.settings.mode === 'adaptive'
                ? 'ADAPTIVE'
                : engine.settings.mode === 'smart_pace'
                ? 'PACING'
                : 'MANUAL'}
            </span>
          </div>

          <button
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className="p-1.5 text-neutral-300 hover:text-white rounded-xl transition active:scale-95"
            title="Pengaturan Teleprompter"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Main Focus Reading Canvas */}
      <div
        className="flex-1 flex items-center justify-center w-full cursor-pointer relative z-10"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, input, a')) return;
          engine.togglePlay();
          resetHideTimer();
        }}
      >
        <FocusZone
          chunks={chunks}
          currentIndex={engine.currentChunkIndex}
          activeWordIndex={engine.activeWordIndex}
          captionMode={engine.resolvedCaptionMode}
          settings={engine.settings}
          pronunciationFeedback={engine.pronunciationFeedback}
          onSkipCorrection={engine.skipPronunciationCorrection}
          onClearPronunciationFeedback={engine.clearPronunciationFeedback}
          onSelectChunk={(idx) => engine.goToChunk(idx, 'MANUAL_CLICK')}
          isLandscape={isLandscape}
          debugMode={debugMode}
          onToggleDebugMode={() => setDebugMode((prev) => !prev)}
        />
      </div>

      {/* 3. 7-Element Instrument Dock (Auto-Hiding) */}
      <TeleControls
        playbackState={engine.playbackState}
        settings={engine.settings}
        currentIndex={engine.currentChunkIndex}
        totalChunks={chunks.length}
        cognitiveState={engine.cognitiveState}
        onTogglePlay={engine.togglePlay}
        onNext={engine.nextChunk}
        onPrev={engine.prevChunk}
        onRestart={engine.restart}
        onUpdateSettings={engine.updateSettings}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        visible={controlsVisible}
        showSettingsDrawer={showSettingsDrawer}
        onToggleSettingsDrawer={setShowSettingsDrawer}
        debugMode={debugMode}
        onToggleDebugMode={() => setDebugMode((prev) => !prev)}
      />
    </div>
  );
}
