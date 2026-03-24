-- Change child_sound_progress.score from int (0-100) to numeric(4,1) (1-10)
-- to match the half-step slider values and the records table.
alter table public.child_sound_progress
  alter column score type numeric(4,1) using score::numeric(4,1),
  drop constraint if exists child_sound_progress_score_check,
  add constraint child_sound_progress_score_check check (score between 1 and 10);
