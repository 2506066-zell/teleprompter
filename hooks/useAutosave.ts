'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AUTOSAVE_DEBOUNCE_MS } from '@/constants/defaults';

interface UseAutosaveOptions {
  scriptId: string;
  title: string;
  rawText: string;
  onSave: (title: string, rawText: string) => Promise<void>;
  enabled?: boolean;
}

export function useAutosave({
  scriptId,
  title,
  rawText,
  onSave,
  enabled = true,
}: UseAutosaveOptions) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState<boolean>(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstMount = useRef(true);

  const draftStorageKey = `focus_tp_draft_${scriptId}`;

  // Check for existing local draft on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !scriptId) return;
    try {
      const savedDraft = localStorage.getItem(draftStorageKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.rawText !== rawText || parsed.title !== title) {
          setHasDraft(true);
        }
      }
    } catch {}
  }, [scriptId, rawText, title, draftStorageKey]);

  // Debounced Autosave Effect
  useEffect(() => {
    if (!enabled || !scriptId) return;

    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    setSaveStatus('unsaved');

    // 1. Immediately store draft in localStorage to guard against crash/network drop
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({ title, rawText, timestamp: Date.now() })
        );
      } catch {}
    }

    // 2. Debounce remote save to Supabase
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await onSave(title, rawText);
        setSaveStatus('saved');
        setLastSavedTime(new Date());

        // Clear local draft once confirmed saved remotely
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(draftStorageKey);
            setHasDraft(false);
          } catch {}
        }
      } catch {
        setSaveStatus('error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [title, rawText, scriptId, enabled, onSave, draftStorageKey]);

  const restoreDraft = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const savedDraft = localStorage.getItem(draftStorageKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setHasDraft(false);
        return { title: parsed.title, rawText: parsed.rawText };
      }
    } catch {}
    return null;
  }, [draftStorageKey]);

  const discardDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(draftStorageKey);
      setHasDraft(false);
    } catch {}
  }, [draftStorageKey]);

  return {
    saveStatus,
    lastSavedTime,
    hasDraft,
    restoreDraft,
    discardDraft,
  };
}
