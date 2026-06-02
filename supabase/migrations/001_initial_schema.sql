-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- Public mirror of auth.users, auto-populated via trigger.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Trigger to create a profile row on every new sign-up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Plants ───────────────────────────────────────────────────────────────────
create table if not exists plants (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references profiles(id) on delete cascade not null,
  species       text not null,
  nickname      text,
  photo_url     text,
  date_acquired date,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── Plant caretakers (shared access) ────────────────────────────────────────
create table if not exists plant_caretakers (
  id         uuid primary key default gen_random_uuid(),
  plant_id   uuid references plants(id) on delete cascade not null,
  user_id    uuid references profiles(id) on delete cascade not null,
  role       text not null default 'COPARENT', -- 'OWNER' | 'COPARENT'
  created_at timestamptz default now(),
  unique (plant_id, user_id)
);

-- ─── Plant invites (for users who don't have an account yet) ──────────────────
create table if not exists plant_invites (
  id          uuid primary key default gen_random_uuid(),
  plant_id    uuid references plants(id) on delete cascade not null,
  email       text not null,
  accepted_at timestamptz,
  created_at  timestamptz default now()
);

-- ─── Watering logs ────────────────────────────────────────────────────────────
create table if not exists watering_logs (
  id          uuid primary key default gen_random_uuid(),
  plant_id    uuid references plants(id) on delete cascade not null,
  watered_by  uuid references profiles(id) on delete set null,
  watered_at  timestamptz default now(),
  notes       text,
  amount_ml   integer
);

-- ─── Fertilize logs ───────────────────────────────────────────────────────────
create table if not exists fertilize_logs (
  id               uuid primary key default gen_random_uuid(),
  plant_id         uuid references plants(id) on delete cascade not null,
  fertilized_by    uuid references profiles(id) on delete set null,
  fertilized_at    timestamptz default now(),
  notes            text,
  fertilizer_name  text
);

-- ─── Care logs ────────────────────────────────────────────────────────────────
create table if not exists care_logs (
  id         uuid primary key default gen_random_uuid(),
  plant_id   uuid references plants(id) on delete cascade not null,
  logged_by  uuid references profiles(id) on delete set null,
  logged_at  timestamptz default now(),
  note       text not null,
  care_type  text -- 'Observation' | 'Repotting' | 'Pruning' | 'Pest treatment' | 'Disease treatment' | 'Other'
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table profiles          enable row level security;
alter table plants            enable row level security;
alter table plant_caretakers  enable row level security;
alter table plant_invites     enable row level security;
alter table watering_logs     enable row level security;
alter table fertilize_logs    enable row level security;
alter table care_logs         enable row level security;

-- Profiles: users can read all profiles (needed to invite by email), edit only own
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Plants: visible to caretakers only
create policy "plants_select" on plants for select
  using (
    exists (
      select 1 from plant_caretakers
      where plant_caretakers.plant_id = plants.id
        and plant_caretakers.user_id  = auth.uid()
    )
  );
create policy "plants_insert" on plants for insert with check (owner_id = auth.uid());
create policy "plants_update" on plants for update
  using (
    exists (
      select 1 from plant_caretakers
      where plant_caretakers.plant_id = plants.id
        and plant_caretakers.user_id  = auth.uid()
    )
  );
create policy "plants_delete" on plants for delete using (owner_id = auth.uid());

-- Caretakers: readable by caretakers, insertable by plant owner
create policy "caretakers_select" on plant_caretakers for select
  using (
    exists (
      select 1 from plant_caretakers pc2
      where pc2.plant_id = plant_caretakers.plant_id
        and pc2.user_id  = auth.uid()
    )
  );
create policy "caretakers_insert" on plant_caretakers for insert
  with check (
    auth.uid() = user_id  -- auto-add self (owner flow)
    or exists (
      select 1 from plants where plants.id = plant_id and plants.owner_id = auth.uid()
    )
  );

-- Invites: readable/insertable by plant caretakers
create policy "invites_select" on plant_invites for select
  using (
    exists (
      select 1 from plant_caretakers
      where plant_caretakers.plant_id = plant_invites.plant_id
        and plant_caretakers.user_id  = auth.uid()
    )
  );
create policy "invites_insert" on plant_invites for insert
  with check (
    exists (
      select 1 from plant_caretakers
      where plant_caretakers.plant_id = plant_invites.plant_id
        and plant_caretakers.user_id  = auth.uid()
    )
  );

-- Logs: readable/insertable by caretakers of the plant
create policy "watering_select" on watering_logs for select
  using (
    exists (
      select 1 from plant_caretakers
      where plant_caretakers.plant_id = watering_logs.plant_id
        and plant_caretakers.user_id  = auth.uid()
    )
  );
create policy "watering_insert" on watering_logs for insert
  with check (
    exists (
      select 1 from plant_caretakers
      where plant_caretakers.plant_id = watering_logs.plant_id
        and plant_caretakers.user_id  = auth.uid()
    )
  );

create policy "fertilize_select" on fertilize_logs for select
  using (
    exists (
      select 1 from plant_caretakers
      where plant_caretakers.plant_id = fertilize_logs.plant_id
        and plant_caretakers.user_id  = auth.uid()
    )
  );
create policy "fertilize_insert" on fertilize_logs for insert
  with check (
    exists (
      select 1 from plant_caretakers
      where plant_caretakers.plant_id = fertilize_logs.plant_id
        and plant_caretakers.user_id  = auth.uid()
    )
  );

create policy "care_select" on care_logs for select
  using (
    exists (
      select 1 from plant_caretakers
      where plant_caretakers.plant_id = care_logs.plant_id
        and plant_caretakers.user_id  = auth.uid()
    )
  );
create policy "care_insert" on care_logs for insert
  with check (
    exists (
      select 1 from plant_caretakers
      where plant_caretakers.plant_id = care_logs.plant_id
        and plant_caretakers.user_id  = auth.uid()
    )
  );

-- ─── Storage bucket for plant photos ─────────────────────────────────────────
-- Run this in the Supabase dashboard > Storage > New bucket:
--   Name: plant-photos, Public: true
-- Or via SQL (requires storage schema):
-- insert into storage.buckets (id, name, public) values ('plant-photos', 'plant-photos', true)
--   on conflict do nothing;
