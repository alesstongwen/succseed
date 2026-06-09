-- Add accepted_by column to plant_invites
alter table plant_invites add column if not exists accepted_by uuid references profiles(id) on delete set null;

-- Allow anyone (including unauthenticated) to read an invite by its id
-- so the AcceptInvite page can show the plant name before login
create policy "invites_read_by_id" on plant_invites for select
  using (true);

-- Allow the invited user to mark the invite as accepted
create policy "invites_update_accept" on plant_invites for update
  using (true)
  with check (true);
