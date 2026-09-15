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
import { TrackingStatusBar } from '@/components/tracking/TrackingStatusBar';
import { ArrowLeft } from 'lucide-react';
import { SAMPLE_SCRIPTS } from '@/constants/defaults';

export default function TeleprompterPage() {
  const params = useParams();
  const scriptId = params.scriptId as string;

  const [scriptTitle, setScriptTitle] = useState('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { isLandscape, orientation } = useOrientation();
  const supabaseConfigured = isSupabaseConfigured();

  // Load script and chunks
  useEffect(() => {
    async function loadTeleprompterData() {
      if (!scriptId) return;
      setIsLoading(true);

      if (!supabaseConfigured) {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('focus_tp_demo_scripts');
          const scripts = stored ? JSON.parse(stored) : [];
          const found = scripts.find((s: any) => s.id === scriptId);

          if (found) {
            setScriptTitle(found.title);
            setChunks(createReadingChunks(found.raw_text, orientation));
          } else {
            const sample = SAMPLE_SCRIPTS[0];
            setScriptTitle(sample.title);
            setChunks(createReadingChunks(sample.text, orientation));
          }
        }
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: scriptData } = await supabase
        .from('scripts')
        .select('*')
        .eq('id', scriptId)
        .single();

      if (scriptData) {
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
      }

      setIsLoading(false);
    }

    loadTeleprompterData();
  }, [scriptId, orientation, supabaseConfigured]);

  const engine = useTeleprompterEngine({
    chunks,
    initialSettings: {
      fontSize: isLandscape ? 44 : 38,
      focusPosition: 'lens_proximity',
      captionMode: 'phrase_focus',
    },
  });

  // Auto-hide controls logic: hide after 3 seconds of playing; show immediately on touch or pause
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (engine.playbackState === 'playing') {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2800);
    }
  }, [engine.playbackState]);

  useEffect(() => {
    if (engine.playbackState === 'playing') {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2200);
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
      <main className="min-h-screen bg-[#050505] flex items-center justify-center text-xs font-mono text-neutral-600">
        Menyiapkan instrumen baca...
      </main>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      className="relative w-screen h-screen min-h-[100dvh] bg-[#050505] text-neutral-100 flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Top Ambient Bar: Quiet Exit link */}
      <div
        className={`absolute top-0 inset-x-0 z-30 p-4 sm:p-6 flex items-center justify-between pointer-events-none transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Link
          href={`/editor/${scriptId}`}
          className="pointer-events-auto p-2 text-neutral-500 hover:text-neutral-200 transition"
          title="Kembali ke Editor"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>

      {/* Persistent quiet ambient cognitive indicator */}
      <TrackingStatusBar
        cognitiveState={engine.cognitiveState}
        elapsedSeconds={engine.elapsedSeconds}
        currentChunkDuration={engine.currentChunk?.estimatedDuration ?? 2}
        visible={true}
      />

      {/* Main Focus Reading Canvas */}
      <div
        className="flex-1 flex items-center justify-center w-full cursor-pointer"
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
          onSelectChunk={(idx) => engine.goToChunk(idx, 'MANUAL_CLICK')}
          isLandscape={isLandscape}
        />
      </div>

      {/* Ambient Teleprompter Controls (Auto-Hiding) */}
      <TeleControls
        playbackState={engine.playbackState}
        settings={engine.settings}
        currentIndex={engine.currentChunkIndex}
        totalChunks={chunks.length}
        onTogglePlay={engine.togglePlay}
        onNext={engine.nextChunk}
        onPrev={engine.prevChunk}
        onRestart={engine.restart}
        onUpdateSettings={engine.updateSettings}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        visible={controlsVisible}
      />
    </div>
  );
}
