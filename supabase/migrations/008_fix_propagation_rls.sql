-- Fix recursive RLS on propagation_caretakers and ensure propagations are
-- visible to co-parents, not just the owner.

-- 1. Fix prop_caretakers_select: the old policy called auth_is_propagation_caretaker()
--    which queries propagation_caretakers again → infinite recursion.
--    Simple fix: each user can see only their own caretaker rows directly.
drop policy if exists "prop_caretakers_select" on propagation_caretakers;
create policy "prop_caretakers_select" on propagation_caretakers for select
  using (user_id = auth.uid());

-- 2. Ensure propagations table has RLS enabled and a select policy for co-parents.
alter table propagations enable row level security;

drop policy if exists "propagations_select" on propagations;
create policy "propagations_select" on propagations for select
  using (auth_is_propagation_caretaker(id));

drop policy if exists "propagations_insert" on propagations;
create policy "propagations_insert" on propagations for insert
  with check (owner_id = auth.uid());

drop policy if exists "propagations_update" on propagations;
create policy "propagations_update" on propagations for update
  using (auth_is_propagation_caretaker(id));

drop policy if exists "propagations_delete" on propagations;
create policy "propagations_delete" on propagations for delete
  using (owner_id = auth.uid());
