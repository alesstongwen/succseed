-- Co-parent sharing for propagations, mirroring the plants pattern.

create table if not exists propagation_caretakers (
  id             uuid primary key default gen_random_uuid(),
  propagation_id uuid references propagations(id) on delete cascade not null,
  user_id        uuid references profiles(id) on delete cascade not null,
  role           text not null default 'COPARENT', -- 'OWNER' | 'COPARENT'
  created_at     timestamptz default now(),
  unique (propagation_id, user_id)
);

alter table propagation_caretakers enable row level security;

-- Security-definer function avoids recursive RLS (same pattern as plants)
create or replace function auth_is_propagation_caretaker(p_propagation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from propagation_caretakers
    where propagation_id = p_propagation_id
      and user_id = auth.uid()
  );
$$;

create policy "prop_caretakers_select" on propagation_caretakers for select
  using (auth_is_propagation_caretaker(propagation_id));

create policy "prop_caretakers_insert" on propagation_caretakers for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from propagations
      where id = propagation_id and owner_id = auth.uid()
    )
  );

create policy "prop_caretakers_delete" on propagation_caretakers for delete
  using (
    exists (
      select 1 from propagations
      where id = propagation_id and owner_id = auth.uid()
    )
  );
