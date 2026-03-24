alter table public.sounds
  add column if not exists stage_number int not null default 0,
  add column if not exists stage_name text not null default '',
  add column if not exists stage_focus text not null default '',
  add column if not exists stage_order int not null default 0;

-- Normalize legacy codes so existing IDs remain stable when possible.
update public.sounds set code = 'j', ipa = '/j/', label = 'J glide sound' where code = 'y';
update public.sounds set code = 'ʃ', ipa = '/ʃ/', label = 'SH sound' where code = 'sh';
update public.sounds set code = 'ʧ', ipa = '/ʧ/', label = 'CH sound' where code = 'ch';
update public.sounds set code = 'θ', ipa = '/θ/', label = 'TH (voiceless) sound' where code = 'th';

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
  ('æ', '/æ/', 'AE vowel sound', 2, 'Early Vowels', 'All vowels together in early learning', 5),
  ('ɑ', '/ɑ/', 'AH vowel sound', 2, 'Early Vowels', 'All vowels together in early learning', 6),
  ('ʌ', '/ʌ/', 'UH vowel sound', 2, 'Early Vowels', 'All vowels together in early learning', 7),
  ('ə', '/ə/', 'Schwa sound', 2, 'Early Vowels', 'All vowels together in early learning', 8),
  ('ɪ', '/ɪ/', 'IH vowel sound', 2, 'Early Vowels', 'All vowels together in early learning', 9),
  ('i', '/i/', 'EE vowel sound', 2, 'Early Vowels', 'All vowels together in early learning', 10),
  ('ɛ', '/ɛ/', 'EH vowel sound', 2, 'Early Vowels', 'All vowels together in early learning', 11),
  ('ʊ', '/ʊ/', 'OO vowel sound', 2, 'Early Vowels', 'All vowels together in early learning', 12),
  ('u', '/u/', 'OO long vowel sound', 2, 'Early Vowels', 'All vowels together in early learning', 13),
  ('e', '/e/', 'AY vowel sound', 2, 'Early Vowels', 'All vowels together in early learning', 14),
  ('o', '/o/', 'OH vowel sound', 2, 'Early Vowels', 'All vowels together in early learning', 15),
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
on conflict (code)
do update set
  ipa = excluded.ipa,
  label = excluded.label,
  stage_number = excluded.stage_number,
  stage_name = excluded.stage_name,
  stage_focus = excluded.stage_focus,
  stage_order = excluded.stage_order;

delete from public.sounds
where code not in (
  'm', 'b', 'p', 'h',
  'æ', 'ɛ', 'ɪ', 'ʌ', 'ʊ', 'ə', 'i', 'e', 'o', 'u', 'ɑ',
  'w', 'j', 'n', 'ŋ',
  'k', 'g',
  'f', 'v', 's', 'z',
  't', 'd',
  'ʃ', 'ʒ', 'ʧ', 'ʤ', 'θ', 'ð',
  'l', 'r',
  'aɪ', 'aʊ', 'ɔɪ', 'oʊ'
);