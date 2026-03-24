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
  stage_number int not null default 0,
  stage_name text not null default '',
  stage_focus text not null default '',
  stage_order int not null default 0,
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

insert into public.sounds (
  code,
  ipa,
  label,
  stage_number,
  stage_name,
  stage_focus,
  stage_order
)
values
  ('m', '/m/', 'M sound', 1, 'Early Sounds', 'Bilabials and visible sounds', 1),
  ('b', '/b/', 'B sound', 1, 'Early Sounds', 'Bilabials and visible sounds', 2),
  ('p', '/p/', 'P sound', 1, 'Early Sounds', 'Bilabials and visible sounds', 3),
  ('h', '/h/', 'H sound', 1, 'Early Sounds', 'Bilabials and visible sounds', 4),
  ('æ', '/æ/', 'AE vowel sound', 2, 'Early Vowels', 'Open, clear vowels', 5),
  ('ɛ', '/ɛ/', 'EH vowel sound', 2, 'Early Vowels', 'Open, clear vowels', 6),
  ('ɪ', '/ɪ/', 'IH vowel sound', 2, 'Early Vowels', 'Open, clear vowels', 7),
  ('ʌ', '/ʌ/', 'UH vowel sound', 2, 'Early Vowels', 'Open, clear vowels', 8),
  ('ʊ', '/ʊ/', 'OO vowel sound', 2, 'Early Vowels', 'Open, clear vowels', 9),
  ('ə', '/ə/', 'Schwa sound', 2, 'Early Vowels', 'Open, clear vowels', 10),
  ('i', '/i/', 'EE vowel sound', 2, 'Early Vowels', 'Open, clear vowels', 11),
  ('e', '/e/', 'AY vowel sound', 2, 'Early Vowels', 'Open, clear vowels', 12),
  ('o', '/o/', 'OH vowel sound', 2, 'Early Vowels', 'Open, clear vowels', 13),
  ('u', '/u/', 'OO long vowel sound', 2, 'Early Vowels', 'Open, clear vowels', 14),
  ('ɑ', '/ɑ/', 'AH vowel sound', 2, 'Early Vowels', 'Open, clear vowels', 15),
  ('w', '/w/', 'W glide sound', 3, 'Glides & Nasals', 'Smooth, continuous sounds', 16),
  ('j', '/j/', 'Y glide sound', 3, 'Glides & Nasals', 'Smooth, continuous sounds', 17),
  ('n', '/n/', 'N sound', 3, 'Glides & Nasals', 'Smooth, continuous sounds', 18),
  ('ŋ', '/ŋ/', 'NG sound', 3, 'Glides & Nasals', 'Smooth, continuous sounds', 19),
  ('k', '/k/', 'K sound', 4, 'Back Sounds', 'Strong, back-of-mouth sounds', 20),
  ('g', '/g/', 'G sound', 4, 'Back Sounds', 'Strong, back-of-mouth sounds', 21),
  ('f', '/f/', 'F sound', 5, 'Early Fricatives', 'Easier, high-frequency fricatives', 22),
  ('v', '/v/', 'V sound', 5, 'Early Fricatives', 'Easier, high-frequency fricatives', 23),
  ('s', '/s/', 'S sound', 5, 'Early Fricatives', 'Easier, high-frequency fricatives', 24),
  ('z', '/z/', 'Z sound', 5, 'Early Fricatives', 'Easier, high-frequency fricatives', 25),
  ('t', '/t/', 'T sound', 6, 'Stops & Alveolars', 'Clear, percussive sounds', 26),
  ('d', '/d/', 'D sound', 6, 'Stops & Alveolars', 'Clear, percussive sounds', 27),
  ('ʃ', '/ʃ/', 'SH sound', 7, 'Later Fricatives & Affricates', 'Harder, less visible sounds', 28),
  ('ʒ', '/ʒ/', 'ZH sound', 7, 'Later Fricatives & Affricates', 'Harder, less visible sounds', 29),
  ('ʧ', '/ʧ/', 'CH sound', 7, 'Later Fricatives & Affricates', 'Harder, less visible sounds', 30),
  ('ʤ', '/ʤ/', 'JH sound', 7, 'Later Fricatives & Affricates', 'Harder, less visible sounds', 31),
  ('θ', '/θ/', 'TH (voiceless) sound', 7, 'Later Fricatives & Affricates', 'Harder, less visible sounds', 32),
  ('ð', '/ð/', 'TH (voiced) sound', 7, 'Later Fricatives & Affricates', 'Harder, less visible sounds', 33),
  ('l', '/l/', 'L sound', 8, 'Lateral & Rhotics', 'Most challenging, complex articulation', 34),
  ('r', '/r/', 'R sound', 8, 'Lateral & Rhotics', 'Most challenging, complex articulation', 35),
  ('aɪ', '/aɪ/', 'Long I diphthong', 9, 'Diphthongs', 'Dynamic, multi-part sounds', 36),
  ('aʊ', '/aʊ/', 'OW diphthong', 9, 'Diphthongs', 'Dynamic, multi-part sounds', 37),
  ('ɔɪ', '/ɔɪ/', 'OY diphthong', 9, 'Diphthongs', 'Dynamic, multi-part sounds', 38),
  ('oʊ', '/oʊ/', 'Long O diphthong', 9, 'Diphthongs', 'Dynamic, multi-part sounds', 39)
on conflict (code) do nothing;
