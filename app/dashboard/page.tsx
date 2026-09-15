'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ScriptCard, ScriptItem } from '@/components/dashboard/ScriptCard';
import { QuickCreateModal } from '@/components/dashboard/QuickCreateModal';
import { Plus, Sliders, LogOut, Search } from 'lucide-react';
import { SAMPLE_SCRIPTS } from '@/constants/defaults';

export default function DashboardPage() {
  const router = useRouter();
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      if (!supabaseConfigured) {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('focus_tp_demo_scripts');
          if (stored) {
            try {
              setScripts(JSON.parse(stored));
            } catch {
              setScripts([]);
            }
          } else {
            const seeded: ScriptItem[] = [
              {
                id: 'sample-1',
                title: SAMPLE_SCRIPTS[0].title,
                raw_text: SAMPLE_SCRIPTS[0].text,
                updated_at: new Date().toISOString(),
              },
            ];
            setScripts(seeded);
            localStorage.setItem('focus_tp_demo_scripts', JSON.stringify(seeded));
          }
        }
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('scripts')
          .select('id, title, raw_text, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (!error && data) {
          setScripts(data);
        }
      }
      setIsLoading(false);
    }

    loadData();
  }, [supabaseConfigured]);

  const handleCreateScript = async (title: string, rawText: string) => {
    if (!supabaseConfigured) {
      const newScript: ScriptItem = {
        id: `script-${Date.now().toString(36)}`,
        title,
        raw_text: rawText,
        updated_at: new Date().toISOString(),
      };
      const updated = [newScript, ...scripts];
      setScripts(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('focus_tp_demo_scripts', JSON.stringify(updated));
      }
      router.push(`/editor/${newScript.id}`);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from('scripts')
      .insert({
        user_id: user.id,
        title,
        raw_text: rawText,
      })
      .select('id')
      .single();

    if (!error && data) {
      router.push(`/editor/${data.id}`);
    }
  };

  const handleDeleteScript = async (id: string) => {
    if (!confirm('Hapus naskah ini?')) return;

    if (!supabaseConfigured) {
      const updated = scripts.filter((s) => s.id !== id);
      setScripts(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('focus_tp_demo_scripts', JSON.stringify(updated));
      }
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from('scripts').delete().eq('id', id);
    if (!error) {
      setScripts((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleSignOut = async () => {
    if (supabaseConfigured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('focus_tp_demo_user');
      }
    }
    router.push('/');
  };

  const filteredScripts = scripts.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.raw_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#050505] text-neutral-100 flex flex-col">
      {/* Quiet Top Navigation */}
      <header className="border-b border-neutral-900 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link href="/" className="font-medium tracking-tight text-neutral-300 text-sm hover:text-white transition">
          Focus Teleprompter
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/calibration"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition"
            title="Kalibrasi Sensor"
          >
            Kalibrasi
          </Link>
          <button
            onClick={handleSignOut}
            className="text-xs text-neutral-600 hover:text-neutral-400 transition"
            title="Keluar"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-medium text-white tracking-tight">
              Daftar Naskah
            </h1>
            <p className="text-xs text-neutral-500 mt-1 font-mono">
              Pilih naskah untuk memulai membaca atau buat naskah baru
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs rounded-full transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Naskah Baru
          </button>
        </div>

        {/* Search */}
        {scripts.length > 2 && (
          <div className="relative mb-6">
            <Search className="w-3.5 h-3.5 text-neutral-600 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari naskah..."
              className="w-full bg-transparent border-b border-neutral-900 pl-8 pr-4 py-1.5 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 transition font-mono"
            />
          </div>
        )}

        {/* Script Rows */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-neutral-600 font-mono">
            Memuat naskah...
          </div>
        ) : filteredScripts.length > 0 ? (
          <div className="divide-y divide-neutral-900">
            {filteredScripts.map((script) => (
              <ScriptCard key={script.id} script={script} onDelete={handleDeleteScript} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-neutral-600 space-y-4">
            <p className="text-xs font-mono">Belum ada naskah tersimpan.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-1.5 text-xs text-neutral-300 border border-neutral-800 rounded-full hover:border-neutral-700 transition"
            >
              Mulai Naskah Pertama
            </button>
          </div>
        )}
      </div>

      <QuickCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateScript}
      />
    </main>
  );
}
