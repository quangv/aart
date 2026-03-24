-- Backfill example words/sound-position mappings in environments where
-- 20260324000100 ran before expected source rows were present.
-- Idempotent by design: words are upserted and word_sounds uses ON CONFLICT DO NOTHING.
begin;

with mappings (
  sound_code,
  position,
  word_text,
  reading_level,
  part_of_speech,
  syllables
) as (
  values
    ('m', 'beginning', 'map', 1, 'other', 1),
    ('m', 'middle', 'lemon', 1, 'other', 2),
    ('m', 'end', 'jam', 1, 'other', 1),

    ('b', 'beginning', 'bat', 1, 'other', 1),
    ('b', 'middle', 'rabbit', 1, 'other', 2),
    ('b', 'end', 'tub', 1, 'other', 1),

    ('p', 'beginning', 'pig', 1, 'other', 1),
    ('p', 'middle', 'apple', 1, 'other', 2),
    ('p', 'end', 'cup', 1, 'other', 1),

    ('h', 'beginning', 'hat', 1, 'other', 1),
    ('h', 'middle', 'behind', 2, 'other', 2),
    ('h', 'end', 'huh', 1, 'other', 1),

    ('æ', 'beginning', 'apple', 1, 'other', 2),
    ('æ', 'middle', 'rabbit', 1, 'other', 2),
    ('æ', 'end', 'cat', 1, 'other', 1),

    ('ɑ', 'beginning', 'octopus', 2, 'other', 3),
    ('ɑ', 'middle', 'father', 2, 'other', 2),
    ('ɑ', 'end', 'spa', 1, 'other', 1),

    ('ʌ', 'beginning', 'up', 1, 'other', 1),
    ('ʌ', 'middle', 'puppy', 1, 'other', 2),
    ('ʌ', 'end', 'cup', 1, 'other', 1),

    ('ə', 'beginning', 'about', 1, 'other', 2),
    ('ə', 'middle', 'banana', 1, 'other', 3),
    ('ə', 'end', 'sofa', 1, 'other', 2),

    ('ɪ', 'beginning', 'igloo', 2, 'other', 2),
    ('ɪ', 'middle', 'kitten', 1, 'other', 2),
    ('ɪ', 'end', 'fish', 1, 'other', 1),

    ('i', 'beginning', 'eagle', 2, 'other', 2),
    ('i', 'middle', 'kiwi', 2, 'other', 2),
    ('i', 'end', 'tree', 1, 'other', 1),

    ('ɛ', 'beginning', 'elephant', 2, 'other', 3),
    ('ɛ', 'middle', 'pepper', 1, 'other', 2),
    ('ɛ', 'end', 'bed', 1, 'other', 1),

    ('ʊ', 'beginning', 'hook', 1, 'other', 1),
    ('ʊ', 'middle', 'cookie', 1, 'other', 2),
    ('ʊ', 'end', 'book', 1, 'other', 1),

    ('u', 'beginning', 'ooze', 2, 'other', 1),
    ('u', 'middle', 'tooth', 1, 'other', 1),
    ('u', 'end', 'blue', 1, 'other', 1),

    ('e', 'beginning', 'acorn', 2, 'other', 2),
    ('e', 'middle', 'rainbow', 2, 'other', 2),
    ('e', 'end', 'day', 1, 'other', 1),

    ('o', 'beginning', 'open', 1, 'other', 2),
    ('o', 'middle', 'robot', 2, 'other', 2),
    ('o', 'end', 'go', 1, 'other', 1),

    ('w', 'beginning', 'we', 1, 'other', 1),
    ('w', 'middle', 'water', 1, 'other', 2),
    ('w', 'end', 'cow', 1, 'other', 1),

    ('j', 'beginning', 'yellow', 1, 'other', 2),
    ('j', 'middle', 'canyon', 2, 'other', 2),
    ('j', 'end', 'toy', 1, 'other', 1),

    ('n', 'beginning', 'nose', 1, 'other', 1),
    ('n', 'middle', 'banana', 1, 'other', 3),
    ('n', 'end', 'sun', 1, 'other', 1),

    ('ŋ', 'beginning', 'ngoni', 3, 'other', 2),
    ('ŋ', 'middle', 'finger', 1, 'other', 2),
    ('ŋ', 'end', 'sing', 1, 'other', 1),

    ('k', 'beginning', 'cat', 1, 'other', 1),
    ('k', 'middle', 'baker', 2, 'other', 2),
    ('k', 'end', 'book', 1, 'other', 1),

    ('g', 'beginning', 'goat', 1, 'other', 1),
    ('g', 'middle', 'tiger', 1, 'other', 2),
    ('g', 'end', 'bag', 1, 'other', 1),

    ('f', 'beginning', 'fan', 1, 'other', 1),
    ('f', 'middle', 'coffee', 1, 'other', 2),
    ('f', 'end', 'leaf', 1, 'other', 1),

    ('v', 'beginning', 'van', 1, 'other', 1),
    ('v', 'middle', 'seven', 1, 'other', 2),
    ('v', 'end', 'glove', 1, 'other', 1),

    ('s', 'beginning', 'sun', 1, 'other', 1),
    ('s', 'middle', 'messy', 1, 'other', 2),
    ('s', 'end', 'bus', 1, 'other', 1),

    ('z', 'beginning', 'zoo', 1, 'other', 1),
    ('z', 'middle', 'music', 1, 'other', 2),
    ('z', 'end', 'nose', 1, 'other', 1),

    ('t', 'beginning', 'top', 1, 'other', 1),
    ('t', 'middle', 'water', 1, 'other', 2),
    ('t', 'end', 'cat', 1, 'other', 1),

    ('d', 'beginning', 'dog', 1, 'other', 1),
    ('d', 'middle', 'ladder', 1, 'other', 2),
    ('d', 'end', 'red', 1, 'other', 1),

    ('ʃ', 'beginning', 'shoe', 1, 'other', 1),
    ('ʃ', 'middle', 'ocean', 2, 'other', 2),
    ('ʃ', 'end', 'fish', 1, 'other', 1),

    ('ʒ', 'beginning', 'genre', 3, 'other', 2),
    ('ʒ', 'middle', 'vision', 2, 'other', 2),
    ('ʒ', 'end', 'beige', 2, 'other', 1),

    ('ʧ', 'beginning', 'chair', 1, 'other', 1),
    ('ʧ', 'middle', 'kitchen', 1, 'other', 2),
    ('ʧ', 'end', 'beach', 1, 'other', 1),

    ('ʤ', 'beginning', 'jam', 1, 'other', 1),
    ('ʤ', 'middle', 'magic', 1, 'other', 2),
    ('ʤ', 'end', 'badge', 1, 'other', 1),

    ('θ', 'beginning', 'thumb', 1, 'other', 1),
    ('θ', 'middle', 'author', 2, 'other', 2),
    ('θ', 'end', 'bath', 1, 'other', 1),

    ('ð', 'beginning', 'this', 1, 'other', 1),
    ('ð', 'middle', 'mother', 1, 'other', 2),
    ('ð', 'end', 'breathe', 2, 'other', 1),

    ('l', 'beginning', 'lip', 1, 'other', 1),
    ('l', 'middle', 'yellow', 1, 'other', 2),
    ('l', 'end', 'ball', 1, 'other', 1),

    ('r', 'beginning', 'red', 1, 'other', 1),
    ('r', 'middle', 'carrot', 1, 'other', 2),
    ('r', 'end', 'car', 1, 'other', 1),

    ('aɪ', 'beginning', 'ice', 1, 'other', 1),
    ('aɪ', 'middle', 'tiger', 1, 'other', 2),
    ('aɪ', 'end', 'pie', 1, 'other', 1),

    ('aʊ', 'beginning', 'owl', 1, 'other', 1),
    ('aʊ', 'middle', 'flower', 1, 'other', 2),
    ('aʊ', 'end', 'cow', 1, 'other', 1),

    ('ɔɪ', 'beginning', 'oil', 2, 'other', 1),
    ('ɔɪ', 'middle', 'toilet', 2, 'other', 2),
    ('ɔɪ', 'end', 'boy', 1, 'other', 1),

    ('oʊ', 'beginning', 'oat', 1, 'other', 1),
    ('oʊ', 'middle', 'robot', 2, 'other', 2),
    ('oʊ', 'end', 'go', 1, 'other', 1)
),
upsert_words as (
  insert into public.words (text, reading_level, part_of_speech, syllables)
  select distinct
    m.word_text,
    m.reading_level,
    m.part_of_speech::public.part_of_speech,
    m.syllables
  from mappings m
  on conflict (text) do update
    set reading_level = least(public.words.reading_level, excluded.reading_level)
)
insert into public.word_sounds (word_id, sound_id, position, sequence_index)
select
  w.id,
  s.id,
  m.position::public.sound_position,
  0
from mappings m
join public.sounds s on s.code = m.sound_code
join public.words w on w.text = m.word_text
on conflict (word_id, sound_id, position, sequence_index) do nothing;

commit;
