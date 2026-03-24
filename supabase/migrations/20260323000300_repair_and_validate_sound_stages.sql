-- Repair and validate sound curriculum stage metadata.
-- Safe to run after manual fixes: this migration uses absolute assignments and is idempotent.

with target(code, stage_number, stage_name, stage_focus, stage_order) as (
  values
    ('m', 1, 'Early Sounds', 'Bilabials and visible sounds', 1),
    ('b', 1, 'Early Sounds', 'Bilabials and visible sounds', 2),
    ('p', 1, 'Early Sounds', 'Bilabials and visible sounds', 3),
    ('h', 1, 'Early Sounds', 'Bilabials and visible sounds', 4),

    ('æ', 2, 'Open & Easy Vowels', 'Easier motor control, less precise tongue placement', 5),
    ('ɑ', 2, 'Open & Easy Vowels', 'Easier motor control, less precise tongue placement', 6),
    ('ʌ', 2, 'Open & Easy Vowels', 'Easier motor control, less precise tongue placement', 7),
    ('ə', 2, 'Open & Easy Vowels', 'Easier motor control, less precise tongue placement', 8),

    ('ɪ', 3, 'Tighter & More Precise Vowels', 'Need more tongue control and lip shaping', 9),
    ('i', 3, 'Tighter & More Precise Vowels', 'Need more tongue control and lip shaping', 10),
    ('ɛ', 3, 'Tighter & More Precise Vowels', 'Need more tongue control and lip shaping', 11),
    ('ʊ', 3, 'Tighter & More Precise Vowels', 'Need more tongue control and lip shaping', 12),
    ('u', 3, 'Tighter & More Precise Vowels', 'Need more tongue control and lip shaping', 13),
    ('e', 3, 'Tighter & More Precise Vowels', 'Need more tongue control and lip shaping', 14),
    ('o', 3, 'Tighter & More Precise Vowels', 'Need more tongue control and lip shaping', 15),

    ('w', 4, 'Glides & Nasals', 'Smooth, continuous sounds', 16),
    ('j', 4, 'Glides & Nasals', 'Smooth, continuous sounds', 17),
    ('n', 4, 'Glides & Nasals', 'Smooth, continuous sounds', 18),
    ('ŋ', 4, 'Glides & Nasals', 'Smooth, continuous sounds', 19),

    ('k', 5, 'Back Sounds', 'Strong, back-of-mouth sounds', 20),
    ('g', 5, 'Back Sounds', 'Strong, back-of-mouth sounds', 21),

    ('f', 6, 'Early Fricatives', 'Easier, high-frequency fricatives', 22),
    ('v', 6, 'Early Fricatives', 'Easier, high-frequency fricatives', 23),
    ('s', 6, 'Early Fricatives', 'Easier, high-frequency fricatives', 24),
    ('z', 6, 'Early Fricatives', 'Easier, high-frequency fricatives', 25),

    ('t', 7, 'Stops & Alveolars', 'Clear, percussive sounds', 26),
    ('d', 7, 'Stops & Alveolars', 'Clear, percussive sounds', 27),

    ('ʃ', 8, 'Later Fricatives & Affricates', 'Harder, less visible sounds', 28),
    ('ʒ', 8, 'Later Fricatives & Affricates', 'Harder, less visible sounds', 29),
    ('ʧ', 8, 'Later Fricatives & Affricates', 'Harder, less visible sounds', 30),
    ('ʤ', 8, 'Later Fricatives & Affricates', 'Harder, less visible sounds', 31),
    ('θ', 8, 'Later Fricatives & Affricates', 'Harder, less visible sounds', 32),
    ('ð', 8, 'Later Fricatives & Affricates', 'Harder, less visible sounds', 33),

    ('l', 9, 'Lateral & Rhotics', 'Most challenging, complex articulation', 34),
    ('r', 9, 'Lateral & Rhotics', 'Most challenging, complex articulation', 35),

    ('aɪ', 10, 'Diphthongs', 'Dynamic, multi-part sounds', 36),
    ('aʊ', 10, 'Diphthongs', 'Dynamic, multi-part sounds', 37),
    ('ɔɪ', 10, 'Diphthongs', 'Dynamic, multi-part sounds', 38),
    ('oʊ', 10, 'Diphthongs', 'Dynamic, multi-part sounds', 39)
)
update public.sounds as s
set
  stage_number = t.stage_number,
  stage_name = t.stage_name,
  stage_focus = t.stage_focus,
  stage_order = t.stage_order
from target as t
where s.code = t.code;

-- Validate canonical totals and per-stage distribution.
do $$
declare
  total_count int;
  s1 int;
  s2 int;
  s3 int;
  s4 int;
  s5 int;
  s6 int;
  s7 int;
  s8 int;
  s9 int;
  s10 int;
begin
  select count(*) into total_count
  from public.sounds
  where code in (
    'm', 'b', 'p', 'h',
    'æ', 'ɑ', 'ʌ', 'ə',
    'ɪ', 'i', 'ɛ', 'ʊ', 'u', 'e', 'o',
    'w', 'j', 'n', 'ŋ',
    'k', 'g',
    'f', 'v', 's', 'z',
    't', 'd',
    'ʃ', 'ʒ', 'ʧ', 'ʤ', 'θ', 'ð',
    'l', 'r',
    'aɪ', 'aʊ', 'ɔɪ', 'oʊ'
  );

  if total_count <> 39 then
    raise exception 'Expected 39 curriculum sounds, found %', total_count;
  end if;

  select count(*) into s1 from public.sounds where stage_number = 1;
  select count(*) into s2 from public.sounds where stage_number = 2;
  select count(*) into s3 from public.sounds where stage_number = 3;
  select count(*) into s4 from public.sounds where stage_number = 4;
  select count(*) into s5 from public.sounds where stage_number = 5;
  select count(*) into s6 from public.sounds where stage_number = 6;
  select count(*) into s7 from public.sounds where stage_number = 7;
  select count(*) into s8 from public.sounds where stage_number = 8;
  select count(*) into s9 from public.sounds where stage_number = 9;
  select count(*) into s10 from public.sounds where stage_number = 10;

  if s1 <> 4 then raise exception 'Stage 1 expected 4, found %', s1; end if;
  if s2 <> 4 then raise exception 'Stage 2 expected 4, found %', s2; end if;
  if s3 <> 7 then raise exception 'Stage 3 expected 7, found %', s3; end if;
  if s4 <> 4 then raise exception 'Stage 4 expected 4, found %', s4; end if;
  if s5 <> 2 then raise exception 'Stage 5 expected 2, found %', s5; end if;
  if s6 <> 4 then raise exception 'Stage 6 expected 4, found %', s6; end if;
  if s7 <> 2 then raise exception 'Stage 7 expected 2, found %', s7; end if;
  if s8 <> 6 then raise exception 'Stage 8 expected 6, found %', s8; end if;
  if s9 <> 2 then raise exception 'Stage 9 expected 2, found %', s9; end if;
  if s10 <> 4 then raise exception 'Stage 10 expected 4, found %', s10; end if;
end $$;
