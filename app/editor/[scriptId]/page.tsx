'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Chunk } from '@/types/teleprompter';
import { createReadingChunks } from '@/lib/script/chunking';
import { useAutosave } from '@/hooks/useAutosave';
import { ScriptEditor } from '@/components/editor/ScriptEditor';
import { SAMPLE_SCRIPTS } from '@/constants/defaults';

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params.scriptId as string;

  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabaseConfigured = isSupabaseConfigured();

  // Load script data
  useEffect(() => {
    async function loadScript() {
      if (!scriptId) return;
      setIsLoading(true);

      const loadFromLocal = () => {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('focus_tp_demo_scripts');
          const scripts = stored ? JSON.parse(stored) : [];
          const found = scripts.find((s: any) => s.id === scriptId);

          if (found) {
            setTitle(found.title);
            setRawText(found.raw_text);
            setChunks(createReadingChunks(found.raw_text, 'portrait'));
            return;
          }
        }
        // Default demo script
        const defaultScript = SAMPLE_SCRIPTS[0];
        setTitle(defaultScript.title);
        setRawText(defaultScript.text);
        setChunks(createReadingChunks(defaultScript.text, 'portrait'));
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
          setTitle(scriptData.title);
          setRawText(scriptData.raw_text);

          // Fetch chunks if any
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
            setChunks(createReadingChunks(scriptData.raw_text, 'portrait'));
          }
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch from Supabase, loading from local:', err);
      }

      // Universal fallback if Supabase table is missing or script not found in cloud
      loadFromLocal();
      setIsLoading(false);
    }

    loadScript();
  }, [scriptId, supabaseConfigured]);

  // Persist callback for autosave
  const handleSave = useCallback(
    async (newTitle: string, newText: string, updatedChunks?: Chunk[]) => {
      setTitle(newTitle);
      setRawText(newText);
      if (updatedChunks) {
        setChunks(updatedChunks);
      }

      // 1. Always save to local storage first as a zero-data-loss guarantee
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('focus_tp_demo_scripts');
        let scripts = stored ? JSON.parse(stored) : [];
        const index = scripts.findIndex((s: any) => s.id === scriptId);

        if (index >= 0) {
          scripts[index] = {
            ...scripts[index],
            title: newTitle,
            raw_text: newText,
            updated_at: new Date().toISOString(),
          };
        } else {
          scripts.unshift({
            id: scriptId,
            title: newTitle,
            raw_text: newText,
            updated_at: new Date().toISOString(),
          });
        }
        localStorage.setItem('focus_tp_demo_scripts', JSON.stringify(scripts));
      }

      // 2. Also persist to Supabase if configured and reachable
      if (supabaseConfigured) {
        try {
          const supabase = createClient();
          await supabase
            .from('scripts')
            .update({
              title: newTitle,
              raw_text: newText,
              updated_at: new Date().toISOString(),
            })
            .eq('id', scriptId);

          const currentChunks = updatedChunks || chunks;
          if (currentChunks.length > 0) {
            await supabase.from('script_chunks').delete().eq('script_id', scriptId);

            const chunksToInsert = currentChunks.map((c, i) => ({
              script_id: scriptId,
              chunk_order: i,
              text: c.text,
              word_count: c.wordCount,
              complexity_score: c.complexityScore,
              emphasis_level: c.emphasisLevel,
              estimated_duration: c.estimatedDuration,
            }));

            await supabase.from('script_chunks').insert(chunksToInsert);
          }
        } catch (err) {
          console.warn('Supabase cloud autosave background error:', err);
        }
      }
    },
    [scriptId, supabaseConfigured, chunks]
  );

  const { saveStatus, hasDraft, restoreDraft, discardDraft } = useAutosave({
    scriptId,
    title,
    rawText,
    onSave: async (t, r) => handleSave(t, r),
    enabled: !isLoading,
  });

  const handleRestoreDraft = () => {
    const draft = restoreDraft();
    if (draft) {
      setTitle(draft.title);
      setRawText(draft.rawText);
      const newChunks = createReadingChunks(draft.rawText, 'portrait');
      setChunks(newChunks);
      handleSave(draft.title, draft.rawText, newChunks);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-950 flex items-center justify-center text-xs font-mono text-neutral-500">
        Memuat naskah editor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 pb-12">
      <ScriptEditor
        scriptId={scriptId}
        initialTitle={title}
        initialRawText={rawText}
        initialChunks={chunks}
        saveStatus={saveStatus}
        hasDraft={hasDraft}
        onSave={handleSave}
        onRestoreDraft={handleRestoreDraft}
        onDiscardDraft={discardDraft}
      />
    </main>
  );
}
