-- The original caretakers_select policy was self-referential:
-- it queried plant_caretakers inside a policy on plant_caretakers, causing
-- a recursive RLS evaluation where co-parents could only see their own row.
--
-- Fix: use a security definer function so the inner check bypasses RLS.

create or replace function auth_is_plant_caretaker(p_plant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from plant_caretakers
    where plant_id = p_plant_id
      and user_id  = auth.uid()
  );
$$;

drop policy if exists "caretakers_select" on plant_caretakers;

create policy "caretakers_select" on plant_caretakers for select
  using (auth_is_plant_caretaker(plant_id));
