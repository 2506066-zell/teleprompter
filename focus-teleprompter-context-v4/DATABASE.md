# Database Architecture

## Tables

### profiles
- id UUID PK references auth.users
- full_name text
- avatar_url text
- created_at timestamptz

### projects
- id UUID PK
- user_id UUID FK auth.users
- name text
- description text nullable
- created_at timestamptz
- updated_at timestamptz

### scripts
- id UUID PK
- user_id UUID FK auth.users
- project_id UUID FK projects nullable
- title text
- raw_text text
- created_at timestamptz
- updated_at timestamptz

### script_chunks
- id UUID PK
- script_id UUID FK scripts
- chunk_order integer
- text text
- word_count integer
- complexity_score numeric
- emphasis_level numeric
- estimated_duration numeric
- created_at timestamptz

### teleprompter_settings
- id UUID PK
- user_id UUID FK auth.users
- font_size integer
- speed_multiplier numeric
- default_wpm integer
- mode text
- theme text
- mirror_mode boolean
- updated_at timestamptz
- unique(user_id)

## RLS
Enable RLS on every user-owned table.

Policies must ensure users can only select/insert/update/delete rows belonging to themselves. Ownership must be enforced through auth.uid(), not merely hidden in UI.

For script_chunks, authorization must be derived safely through ownership of the parent script.

## Data strategy
Persist raw script as source of truth. Persist generated chunks when useful for restoration, but allow regeneration after algorithm changes.
