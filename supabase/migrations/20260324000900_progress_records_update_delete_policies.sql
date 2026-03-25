create policy "Parents can update own children progress records"
on public.child_sound_progress_records
for update
using (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and c.parent_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and c.parent_id = (select auth.uid())
  )
);

create policy "Parents can delete own children progress records"
on public.child_sound_progress_records
for delete
using (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and c.parent_id = (select auth.uid())
  )
);
