-- Split Early Vowels (Stage 2) into two distinct stages:
-- Stage 2: Open & Easy Vowels (4 sounds - easier motor control)
-- Stage 3: Tighter & More Precise Vowels (7 sounds - need more tongue control)
-- All subsequent stages shift up by 1

-- Update open & easy vowels (keep in Stage 2)
update public.sounds set
  stage_number = 2,
  stage_name = 'Open & Easy Vowels',
  stage_focus = 'Easier motor control, less precise tongue placement',
  stage_order = stage_order
where code in ('æ', 'ɑ', 'ʌ', 'ə');

-- Create tighter & more precise vowels (new Stage 3)
update public.sounds set
  stage_number = 3,
  stage_name = 'Tighter & More Precise Vowels',
  stage_focus = 'Need more tongue control and lip shaping',
  stage_order = stage_order + 7  -- shift order after the 4 open vowels
where code in ('ɪ', 'i', 'ɛ', 'ʊ', 'u', 'e', 'o');

-- Shift all stages 3+ up to 4+
update public.sounds set stage_number = stage_number + 1
where stage_number >= 3 and code not in ('ɪ', 'i', 'ɛ', 'ʊ', 'u', 'e', 'o');
