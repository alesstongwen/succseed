create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade not null,
  type       text not null,
  title      text not null,
  body       text,
  data       jsonb,
  read_at    timestamptz,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

create policy "notifications_select" on notifications for select
  using (user_id = auth.uid());

create policy "notifications_update" on notifications for update
  using (user_id = auth.uid());

create policy "notifications_insert" on notifications for insert
  with check (true);
