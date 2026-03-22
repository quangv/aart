create extension if not exists "pgcrypto";

create type public.sound_position as enum ('beginning', 'middle', 'end');
create type public.part_of_speech as enum (
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'determiner',
  'interjection',
  'conjunction',
  'other'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  birth_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.sounds (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  ipa text,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  text text not null unique,
  reading_level int not null default 1 check (reading_level between 1 and 12),
  part_of_speech public.part_of_speech not null default 'other',
  syllables int not null default 1 check (syllables > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.word_sounds (
  id bigserial primary key,
  word_id uuid not null references public.words(id) on delete cascade,
  sound_id uuid not null references public.sounds(id) on delete cascade,
  position public.sound_position not null,
  sequence_index int not null default 0,
  unique (word_id, sound_id, position, sequence_index)
);

create table if not exists public.child_sound_progress (
  id bigserial primary key,
  child_id uuid not null references public.children(id) on delete cascade,
  sound_id uuid not null references public.sounds(id) on delete cascade,
  position public.sound_position not null,
  score int not null default 0 check (score between 0 and 100),
  attempts int not null default 0 check (attempts >= 0),
  mastered boolean not null default false,
  last_practiced_at timestamptz not null default now(),
  unique (child_id, sound_id, position)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.child_sound_progress enable row level security;
alter table public.words enable row level security;
alter table public.word_sounds enable row level security;
alter table public.sounds enable row level security;

create policy "Parents can view own profile"
on public.profiles
for select
using ((select auth.uid()) = id);

create policy "Parents can update own profile"
on public.profiles
for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Parents can insert own child profiles"
on public.children
for insert
with check ((select auth.uid()) = parent_id);

create policy "Parents can read own child profiles"
on public.children
for select
using ((select auth.uid()) = parent_id);

create policy "Parents can update own child profiles"
on public.children
for update
using ((select auth.uid()) = parent_id)
with check ((select auth.uid()) = parent_id);

create policy "Parents can delete own child profiles"
on public.children
for delete
using ((select auth.uid()) = parent_id);

create policy "Parents can read own children progress"
on public.child_sound_progress
for select
using (
  exists (
    select 1
    from public.children c
    where c.id = child_id
      and c.parent_id = (select auth.uid())
  )
);

create policy "Parents can upsert own children progress"
on public.child_sound_progress
for all
using (
  exists (
    select 1
    from public.children c
    where c.id = child_id
      and c.parent_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.children c
    where c.id = child_id
      and c.parent_id = (select auth.uid())
  )
);

create policy "Authenticated users can read sounds"
on public.sounds
for select
to authenticated
using (true);

create policy "Authenticated users can read words"
on public.words
for select
to authenticated
using (true);

create policy "Authenticated users can read word sounds"
on public.word_sounds
for select
to authenticated
using (true);

insert into public.sounds (code, ipa, label)
values
  ('p', '/p/', 'P sound'),
  ('b', '/b/', 'B sound'),
  ('m', '/m/', 'M sound'),
  ('n', '/n/', 'N sound'),
  ('t', '/t/', 'T sound'),
  ('d', '/d/', 'D sound'),
  ('k', '/k/', 'K sound'),
  ('g', '/g/', 'G sound'),
  ('s', '/s/', 'S sound'),
  ('z', '/z/', 'Z sound'),
  ('f', '/f/', 'F sound'),
  ('v', '/v/', 'V sound'),
  ('r', '/r/', 'R sound'),
  ('l', '/l/', 'L sound'),
  ('w', '/w/', 'W sound'),
  ('y', '/j/', 'Y sound'),
  ('sh', '/ʃ/', 'SH sound'),
  ('ch', '/tʃ/', 'CH sound'),
  ('th', '/θ/', 'TH sound')
on conflict (code) do nothing;
