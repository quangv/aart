begin;

alter table public.words
  add column if not exists frequency_rank integer;

-- Backfill with a deterministic proxy rank so common/easier words are preferred.
with ranked as (
  select
    id,
    row_number() over (
      order by
        reading_level asc,
        syllables asc,
        length(text) asc,
        text asc
    ) as rank_value
  from public.words
)
update public.words w
set frequency_rank = r.rank_value
from ranked r
where w.id = r.id
  and (w.frequency_rank is null or w.frequency_rank <= 0);

create index if not exists words_frequency_rank_idx
  on public.words (frequency_rank, reading_level, text);

commit;
