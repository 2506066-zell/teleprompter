-- Focus Teleprompter v4 Initial Schema Migration
-- Enables extensions and creates tables, RLS policies, and triggers

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Scripts Table
CREATE TABLE IF NOT EXISTS public.scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Untitled Script',
    raw_text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Script Chunks Table
CREATE TABLE IF NOT EXISTS public.script_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
    chunk_order INTEGER NOT NULL,
    text TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    complexity_score NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    emphasis_level NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    estimated_duration NUMERIC(6, 2) NOT NULL DEFAULT 2.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Teleprompter Settings Table
CREATE TABLE IF NOT EXISTS public.teleprompter_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    font_size INTEGER NOT NULL DEFAULT 36,
    speed_multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
    default_wpm INTEGER NOT NULL DEFAULT 140,
    mode TEXT NOT NULL DEFAULT 'adaptive', -- 'manual', 'smart_pace', 'voice_follow', 'adaptive'
    theme TEXT NOT NULL DEFAULT 'dark',
    mirror_mode BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON public.scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_project_id ON public.scripts(project_id);
CREATE INDEX IF NOT EXISTS idx_script_chunks_script_id_order ON public.script_chunks(script_id, chunk_order ASC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teleprompter_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies: Projects
CREATE POLICY "Users can CRUD own projects"
    ON public.projects FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies: Scripts
CREATE POLICY "Users can CRUD own scripts"
    ON public.scripts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies: Script Chunks (Authorized through parent script ownership)
CREATE POLICY "Users can select chunks of own scripts"
    ON public.script_chunks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.scripts
            WHERE public.scripts.id = public.script_chunks.script_id
            AND public.scripts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert chunks to own scripts"
    ON public.script_chunks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.scripts
            WHERE public.scripts.id = public.script_chunks.script_id
            AND public.scripts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update chunks of own scripts"
    ON public.script_chunks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.scripts
            WHERE public.scripts.id = public.script_chunks.script_id
            AND public.scripts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete chunks of own scripts"
    ON public.script_chunks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.scripts
            WHERE public.scripts.id = public.script_chunks.script_id
            AND public.scripts.user_id = auth.uid()
        )
    );

-- RLS Policies: Teleprompter Settings
CREATE POLICY "Users can CRUD own settings"
    ON public.teleprompter_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Function and trigger to auto-create profile and default settings upon signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
        COALESCE(new.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.teleprompter_settings (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
