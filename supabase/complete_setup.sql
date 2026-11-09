-- ==============================================================================
-- ELECTROGRID MT — COMPLETE SUPABASE DATABASE SETUP & SEED DATA
-- Executați acest script în Supabase Dashboard -> SQL Editor
-- Proiect: https://supabase.com/dashboard/project/naxajmglxwjlqmiehwld/sql/new
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. ZONES (5 distinct zones required by PDF)
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  code text,
  description text,
  created_at timestamptz default now() not null
);

-- 3. USER PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null check (role in ('admin', 'electrician')),
  assigned_zone_id uuid references public.zones(id) on delete set null,
  full_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 4. ELECTRICAL STATIONS (Stații electrice)
create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz default now() not null,
  unique (zone_id, name)
);

-- 5. 20 kV LINES (Linii de 20 kV)
create table if not exists public.lines (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  name text not null,
  voltage_kv integer not null default 20,
  code text,
  created_at timestamptz default now() not null,
  unique (station_id, name)
);

-- 6. EQUIPMENT (Echipamente: PT, PCT, Separator etc.)
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  equipment_code text unique not null, -- Unique ID (e.g. SEP-20-INT-01)
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

-- 7. OBSERVATIONS (Sesizări și observații de teren)
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

-- 8. AUDIT LOG / MODIFICATION HISTORY (Istoric modificări)
create table if not exists public.modification_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- Indexes for performance
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

create or replace function public.current_profile_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function public.current_assigned_zone_id()
returns uuid as $$
  select assigned_zone_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- PROFILES
create policy "Allow authenticated users to read profiles"
  on public.profiles for select to authenticated using (true);

create policy "Allow admins to manage profiles"
  on public.profiles for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- ZONES
create policy "Admins see all zones, electricians see only assigned zone"
  on public.zones for select to authenticated
  using (public.current_profile_role() = 'admin' or id = public.current_assigned_zone_id());

create policy "Admins can manage zones"
  on public.zones for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- STATIONS
create policy "Users see stations in permitted zones"
  on public.stations for select to authenticated
  using (public.current_profile_role() = 'admin' or zone_id = public.current_assigned_zone_id());

create policy "Admins can manage stations"
  on public.stations for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- LINES
create policy "Users see lines in permitted stations"
  on public.lines for select to authenticated
  using (
    public.current_profile_role() = 'admin'
    or exists (
      select 1 from public.stations s
      where s.id = lines.station_id
        and s.zone_id = public.current_assigned_zone_id()
    )
  );

create policy "Admins can manage lines"
  on public.lines for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- EQUIPMENT
create policy "Users see equipment in permitted lines"
  on public.equipment for select to authenticated
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
  on public.equipment for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- OBSERVATIONS
create policy "Admins see all observations, electricians see permitted equipment observations"
  on public.observations for select to authenticated
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
  on public.observations for insert to authenticated
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
  on public.observations for update to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- MODIFICATION HISTORY
create policy "Admins can view modification history"
  on public.modification_history for select to authenticated
  using (public.current_profile_role() = 'admin');

create policy "Authenticated users can record audit actions"
  on public.modification_history for insert to authenticated
  with check (auth.uid() is not null);

-- ==============================================================================
-- SEED DATA: 5 OFFICIAL ZONES, STATIONS, LINES, EQUIPMENT & USER PROFILES
-- ==============================================================================

-- 1. Insert Zones
insert into public.zones (id, name, code, description) values
  ('11111111-1111-1111-1111-111111111111', 'Săcele + Prejmer', 'Z-SP', 'Zona operativă Săcele – Prejmer'),
  ('22222222-2222-2222-2222-222222222222', 'Râșnov + Predeal', 'Z-RP', 'Zona operativă Râșnov – Predeal'),
  ('33333333-3333-3333-3333-333333333333', 'Codlea + Feldioara', 'Z-CF', 'Zona operativă Codlea – Feldioara'),
  ('44444444-4444-4444-4444-444444444444', 'Victoria + Făgăraș', 'Z-VF', 'Zona operativă Victoria – Făgăraș'),
  ('55555555-5555-5555-5555-555555555555', 'Rupea', 'Z-RU', 'Zona operativă Rupea')
on conflict (name) do nothing;

-- 2. Link Profiles to Created Supabase Auth Users
insert into public.profiles (id, username, role, assigned_zone_id, full_name) values
  ('e897de4c-090a-4569-9a97-0f03cdad6cdb', 'admin', 'admin', null, 'Ing. Administrator Rețea MT'),
  ('87bd2993-627e-43cd-b42c-240d839ac6b6', 'electrician_sacele', 'electrician', '11111111-1111-1111-1111-111111111111', 'Electrician Formația Săcele–Prejmer'),
  ('dd8fb4e9-392d-457b-ae86-030615684672', 'electrician_rasnov', 'electrician', '22222222-2222-2222-2222-222222222222', 'Electrician Formația Râșnov–Predeal'),
  ('18c0f6ba-efcc-4610-b9a0-56d23e365198', 'electrician_codlea', 'electrician', '33333333-3333-3333-3333-333333333333', 'Electrician Formația Codlea–Feldioara')
on conflict (id) do update set
  assigned_zone_id = excluded.assigned_zone_id,
  role = excluded.role,
  full_name = excluded.full_name;

-- 3. Insert Stations
insert into public.stations (id, zone_id, name, code) values
  ('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Prejmer', 'ST-PRJ'),
  ('a1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Săcele', 'ST-SAC'),
  ('a2222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Râșnov', 'ST-RSN'),
  ('a2222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Predeal', 'ST-PRD'),
  ('a3333333-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Codlea', 'ST-CDL'),
  ('a3333333-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Feldioara', 'ST-FLD'),
  ('a4444444-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Făgăraș', 'ST-FAG'),
  ('a4444444-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'Victoria', 'ST-VIC'),
  ('a5555555-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'Rupea', 'ST-RUP')
on conflict (zone_id, name) do nothing;

-- 4. Insert 20 kV Lines
insert into public.lines (id, station_id, name, voltage_kv, code) values
  ('b1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 'Întorsura', 20, 'L-INT'),
  ('b1111111-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000001', 'Hărman', 20, 'L-HAR'),
  ('b1111111-0000-0000-0000-000000000003', 'a1111111-0000-0000-0000-000000000001', 'Zizin', 20, 'L-ZIZ'),
  ('b1111111-0000-0000-0000-000000000004', 'a1111111-0000-0000-0000-000000000001', 'Ozun', 20, 'L-OZN'),
  ('b2222222-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000001', 'Linia Chei', 20, 'L-CHE'),
  ('b3333333-0000-0000-0000-000000000001', 'a3333333-0000-0000-0000-000000000001', 'Linia Ghimbav', 20, 'L-GHI'),
  ('b4444444-0000-0000-0000-000000000001', 'a4444444-0000-0000-0000-000000000001', 'Linia Combinat', 20, 'L-COM'),
  ('b5555555-0000-0000-0000-000000000001', 'a5555555-0000-0000-0000-000000000001', 'Linia Homorod', 20, 'L-HOM')
on conflict (station_id, name) do nothing;

-- 5. Insert Equipment (Prejmer -> Linia Întorsura)
insert into public.equipment (id, equipment_code, name, equipment_type, line_id, locality, latitude, longitude, official_observations, is_unavailable, unavailable_reason) values
  ('eq-00000001-0000-0000-0000-000000000001', 'SEP-20-INT-01', 'Separator MT 20kV Întorsura 1', 'Separator', 'b1111111-0000-0000-0000-000000000001', 'Prejmer', 45.722514, 25.776318, 'Acces direct din drumul principal, stâlp metalic.', false, null),
  ('eq-00000001-0000-0000-0000-000000000004', 'SEP-20-INT-04', 'Separator MT 20kV Întorsura 4', 'Separator', 'b1111111-0000-0000-0000-000000000001', 'Prejmer', 45.728920, 25.789140, 'Acces dintr-un drum lateral pietruit, la 150m de lizieră.', false, null),
  ('eq-00000001-0000-0000-0000-000000000002', 'PT-20-INT-02', 'PT 122 Întorsura', 'PT', 'b1111111-0000-0000-0000-000000000001', 'Prejmer', 45.731400, 25.782100, 'Post aerian pe stâlp de beton.', false, null),
  ('eq-00000001-0000-0000-0000-000000000005', 'PT-20-INT-05', 'PT 125 Întorsura', 'PT', 'b1111111-0000-0000-0000-000000000001', 'Lunca Câlnicului', 45.738100, 25.801200, 'Acces dificil pe timp de ploaie prin teren agricol.', false, null),
  ('eq-00000001-0000-0000-0000-000000000003', 'PCT-20-INT-01', 'PCT 14 Întorsura', 'PCT', 'b1111111-0000-0000-0000-000000000001', 'Prejmer', 45.726200, 25.779400, 'Punct de conexiuni în anvelopă de beton.', true, 'Mecanism de acționare blocat. Necesită înlocuire celulă.'),
  ('eq-00000001-0000-0000-0000-000000000006', 'SEP-20-INT-08', 'Separator MT 20kV Ramificație Pod', 'Separator', 'b1111111-0000-0000-0000-000000000001', 'Prejmer', 45.734500, 25.794200, 'Lipsă manetă acționare manuală conform ultimei revizii.', false, null),
  ('eq-00000001-0000-0000-0000-000000000007', 'PT-20-HAR-01', 'PT 1 Hărman Centru', 'PT', 'b1111111-0000-0000-0000-000000000002', 'Hărman', 45.711200, 25.688100, 'Post zidit lângă primărie.', false, null)
on conflict (equipment_code) do nothing;

-- 6. Insert Initial Observation
insert into public.observations (id, equipment_id, author_id, text, category, status, created_at) values
  ('obs-00000001-0000-0000-0000-000000000001', 'eq-00000001-0000-0000-0000-000000000004', '87bd2993-627e-43cd-b42c-240d839ac6b6', 'Vegetație abundentă la baza stâlpului separatorului. Necesită defrișare pentru acces sigur.', 'acces', 'pending', now() - interval '4 hours')
on conflict (id) do nothing;

-- 7. Insert Audit Record
insert into public.modification_history (id, user_id, action_type, entity_type, entity_id, details, created_at) values
  ('audit-00000001-0000-0000-0000-000000000001', 'e897de4c-090a-4569-9a97-0f03cdad6cdb', 'status_change', 'equipment', 'eq-00000001-0000-0000-0000-000000000003', '{"reason": "Mecanism de acționare blocat", "status": "unavailable"}'::jsonb, now() - interval '1 day')
on conflict (id) do nothing;

