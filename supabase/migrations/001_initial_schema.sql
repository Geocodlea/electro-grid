-- ElectroGrid MT Schema and Row Level Security
-- Functional requirements based strictly on Ghid_simplu_ElectroGrid_MT.pdf

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. ZONES (5 distinct zones required by PDF)
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  code text,
  description text,
  created_at timestamptz default now() not null
);

-- 2. USER PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null check (role in ('admin', 'electrician')),
  assigned_zone_id uuid references public.zones(id) on delete set null,
  full_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. ELECTRICAL STATIONS (Stații electrice)
create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz default now() not null,
  unique (zone_id, name)
);

-- 4. 20 kV LINES (Linii de 20 kV)
create table if not exists public.lines (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  name text not null,
  voltage_kv integer not null default 20,
  code text,
  created_at timestamptz default now() not null,
  unique (station_id, name)
);

-- 5. EQUIPMENT (Echipamente: PT, PCT, Separator etc.)
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  equipment_code text unique not null, -- Unique ID (e.g. SEP-20-INT-01, PT-PRJ-05)
  name text not null,
  equipment_type text not null default 'PT',
  line_id uuid not null references public.lines(id) on delete cascade,
  locality text,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  official_observations text,
  is_unavailable boolean not null default false, -- RED status priority
  unavailable_reason text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 6. OBSERVATIONS (Sesizări și observații de teren)
create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  category text not null default 'altele' check (category in ('acces', 'defect', 'maneta_lipsa', 'gps_gresit', 'altele')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'needs_verification')),
  admin_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now() not null
);

-- 7. AUDIT LOG / MODIFICATION HISTORY (Istoric modificări)
create table if not exists public.modification_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- Indexes for lightning fast lookups
create index if not exists idx_stations_zone on public.stations(zone_id);
create index if not exists idx_lines_station on public.lines(station_id);
create index if not exists idx_equipment_line on public.equipment(line_id);
create index if not exists idx_equipment_code on public.equipment(equipment_code);
create index if not exists idx_observations_equipment on public.observations(equipment_id);
create index if not exists idx_observations_status on public.observations(status);
create index if not exists idx_history_user on public.modification_history(user_id);
create index if not exists idx_history_created on public.modification_history(created_at desc);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.zones enable row level security;
alter table public.stations enable row level security;
alter table public.lines enable row level security;
alter table public.equipment enable row level security;
alter table public.observations enable row level security;
alter table public.modification_history enable row level security;

-- Helper security functions
create or replace function public.current_profile_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function public.current_assigned_zone_id()
returns uuid as $$
  select assigned_zone_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- PROFILES POLICIES
create policy "Allow authenticated users to read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Allow admins to manage profiles"
  on public.profiles for all
  to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- ZONES POLICIES
create policy "Admins see all zones, electricians see only assigned zone"
  on public.zones for select
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or id = public.current_assigned_zone_id()
  );

create policy "Admins can manage zones"
  on public.zones for all
  to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- STATIONS POLICIES
create policy "Users see stations in permitted zones"
  on public.stations for select
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or zone_id = public.current_assigned_zone_id()
  );

create policy "Admins can manage stations"
  on public.stations for all
  to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- LINES POLICIES
create policy "Users see lines in permitted stations"
  on public.lines for select
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or exists (
      select 1 from public.stations s
      where s.id = lines.station_id
        and s.zone_id = public.current_assigned_zone_id()
    )
  );

create policy "Admins can manage lines"
  on public.lines for all
  to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- EQUIPMENT POLICIES
create policy "Users see equipment in permitted lines"
  on public.equipment for select
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or exists (
      select 1 from public.lines l
      join public.stations s on l.station_id = s.id
      where l.id = equipment.line_id
        and s.zone_id = public.current_assigned_zone_id()
    )
  );

create policy "Admins can manage equipment"
  on public.equipment for all
  to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- OBSERVATIONS POLICIES
create policy "Admins see all observations, electricians see permitted equipment observations"
  on public.observations for select
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or exists (
      select 1 from public.equipment e
      join public.lines l on e.line_id = l.id
      join public.stations s on l.station_id = s.id
      where e.id = observations.equipment_id
        and s.zone_id = public.current_assigned_zone_id()
    )
  );

create policy "Electricians can insert observations for permitted equipment"
  on public.observations for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.equipment e
      join public.lines l on e.line_id = l.id
      join public.stations s on l.station_id = s.id
      where e.id = equipment_id
        and (public.current_profile_role() = 'admin' or s.zone_id = public.current_assigned_zone_id())
    )
  );

create policy "Admins can update observations"
  on public.observations for update
  to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- MODIFICATION HISTORY POLICIES
create policy "Admins can view modification history"
  on public.modification_history for select
  to authenticated
  using (public.current_profile_role() = 'admin');

create policy "Authenticated users can record audit actions"
  on public.modification_history for insert
  to authenticated
  with check (auth.uid() is not null);

