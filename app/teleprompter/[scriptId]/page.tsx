'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const scriptId = params.scriptId as string;

  const [scriptTitle, setScriptTitle] = useState('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
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
      fontSize: isLandscape ? 44 : 36,
    },
  });

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
      <main className="min-h-screen bg-black flex items-center justify-center text-xs font-mono text-neutral-500">
        Menyiapkan teleprompter...
      </main>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen min-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Top Bar: Back to editor & Tracking status */}
      <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 flex items-center justify-between pointer-events-none">
        <Link
          href={`/editor/${scriptId}`}
          className="pointer-events-auto p-2.5 bg-neutral-900/70 hover:bg-neutral-800 backdrop-blur-md border border-neutral-800/80 rounded-xl text-neutral-300 hover:text-white transition"
          title="Kembali ke Editor"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <TrackingStatusBar
          mode={engine.settings.mode}
          voiceStatus={engine.voice.status}
          faceStatus={engine.face.status}
          lastHoldReason={engine.lastHoldReason}
          elapsedSeconds={engine.elapsedSeconds}
          currentChunkDuration={engine.currentChunk?.estimatedDuration ?? 2}
        />
      </div>

      {/* Main Focus Zone Area */}
      <div
        className="flex-1 flex items-center justify-center w-full px-2 sm:px-6 cursor-pointer"
        onClick={(e) => {
          // If clicking background (not controls), toggle play/pause
          if ((e.target as HTMLElement).closest('button, input, a')) return;
          engine.togglePlay();
        }}
      >
        <FocusZone
          chunks={chunks}
          currentIndex={engine.currentChunkIndex}
          settings={engine.settings}
          onSelectChunk={(idx) => engine.goToChunk(idx, 'MANUAL_CLICK')}
          isLandscape={isLandscape}
        />
      </div>

      {/* Bottom Teleprompter Controls */}
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
        voiceStatus={engine.voice.status}
        faceStatus={engine.face.status}
      />
    </div>
  );
}
