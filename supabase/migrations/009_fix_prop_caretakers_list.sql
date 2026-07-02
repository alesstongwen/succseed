-- Fix: prop_caretakers_select was too restrictive (only own row visible).
-- auth_is_propagation_caretaker is security definer so it bypasses RLS —
-- no recursion risk. Restore it so all co-parents for a shared propagation
-- are visible to everyone in that propagation.
drop policy if exists "prop_caretakers_select" on propagation_caretakers;
create policy "prop_caretakers_select" on propagation_caretakers for select
  using (auth_is_propagation_caretaker(propagation_id));
