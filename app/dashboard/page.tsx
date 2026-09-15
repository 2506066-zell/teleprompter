'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ScriptCard, ScriptItem } from '@/components/dashboard/ScriptCard';
import { QuickCreateModal } from '@/components/dashboard/QuickCreateModal';
import { Plus, Sliders, LogOut, FileText, Search, Sparkles } from 'lucide-react';
import { SAMPLE_SCRIPTS } from '@/constants/defaults';

export default function DashboardPage() {
  const router = useRouter();
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userName, setUserName] = useState<string>('Creator');

  const supabaseConfigured = isSupabaseConfigured();

  // Load scripts from Supabase or Local Storage demo
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      if (!supabaseConfigured) {
        // Local demo mode storage
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('focus_tp_demo_scripts');
          if (stored) {
            try {
              setScripts(JSON.parse(stored));
            } catch {
              setScripts([]);
            }
          } else {
            // Seed with sample script
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

          const userStored = localStorage.getItem('focus_tp_demo_user');
          if (userStored) {
            try {
              const u = JSON.parse(userStored);
              if (u.full_name) setUserName(u.full_name);
            } catch {}
          }
        }
        setIsLoading(false);
        return;
      }

      // Supabase remote fetch
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Creator');
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
    if (!confirm('Apakah Anda yakin ingin menghapus naskah ini?')) return;

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
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-neutral-900 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-black font-black text-base shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
              F
            </div>
            <span className="font-bold tracking-tight text-white text-lg">Focus Teleprompter</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/calibration"
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-xl transition"
            title="Kalibrasi Sensor"
          >
            <Sliders className="w-4 h-4" />
          </Link>
          <button
            onClick={handleSignOut}
            className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 rounded-xl transition"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Welcome and Action bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Halo, {userName}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Kelola naskah video Anda dan mulai membaca dengan adaptive teleprompter.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/10 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Buat Skrip Baru
          </button>
        </div>

        {/* Search & Filter bar */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan judul atau isi naskah..."
            className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500/80 transition"
          />
        </div>

        {/* Scripts Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-neutral-500 font-mono">
            Memuat daftar naskah...
          </div>
        ) : filteredScripts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScripts.map((script) => (
              <ScriptCard key={script.id} script={script} onDelete={handleDeleteScript} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-3xl p-8">
            <FileText className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Belum Ada Skrip</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-6">
              Mulai buat skrip pertama Anda atau coba contoh naskah untuk menguji Adaptive AI Teleprompter.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Buat Skrip Pertama
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
