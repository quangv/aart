-- Change birth_date from full date to month/year only (YYYY-MM format)
alter table public.children alter column birth_date set data type text;
