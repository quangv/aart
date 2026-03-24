create table if not exists public.child_sound_progress_records (
  id bigserial primary key,
  child_id uuid not null references public.children(id) on delete cascade,
  sound_id uuid not null references public.sounds(id) on delete cascade,
  position public.sound_position not null,
  score numeric(4,1) not null check (score between 1 and 10),
  notes text,
  recorded_at timestamptz not null default now()
);

alter table public.child_sound_progress_records enable row level security;

create policy "Parents can read own children progress records"
on public.child_sound_progress_records
for select
using (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and c.parent_id = (select auth.uid())
  )
);

create policy "Parents can insert own children progress records"
on public.child_sound_progress_records
for insert
with check (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and c.parent_id = (select auth.uid())
  )
);
