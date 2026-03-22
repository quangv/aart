-- Allow authenticated users to create their own profile row.
-- This lets app-side upsert recover accounts that missed the auth trigger.
drop policy if exists "Parents can insert own profile" on public.profiles;

create policy "Parents can insert own profile"
on public.profiles
for insert
with check ((select auth.uid()) = id);
