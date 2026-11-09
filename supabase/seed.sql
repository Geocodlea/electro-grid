-- ElectroGrid MT Seed Data
-- 5 zones according to Ghid_simplu_ElectroGrid_MT.pdf

-- Insert the 5 official zones
insert into public.zones (id, name, code, description) values
  ('11111111-1111-1111-1111-111111111111', 'Săcele + Prejmer', 'Z-SP', 'Zona operativă Săcele – Prejmer'),
  ('22222222-2222-2222-2222-222222222222', 'Râșnov + Predeal', 'Z-RP', 'Zona operativă Râșnov – Predeal'),
  ('33333333-3333-3333-3333-333333333333', 'Codlea + Feldioara', 'Z-CF', 'Zona operativă Codlea – Feldioara'),
  ('44444444-4444-4444-4444-444444444444', 'Victoria + Făgăraș', 'Z-VF', 'Zona operativă Victoria – Făgăraș'),
  ('55555555-5555-5555-5555-555555555555', 'Rupea', 'Z-RU', 'Zona operativă Rupea')
on conflict (name) do nothing;

-- Insert Stations for Zone 1 (Săcele + Prejmer)
insert into public.stations (id, zone_id, name, code) values
  ('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Prejmer', 'ST-PRJ'),
  ('a1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Săcele', 'ST-SAC')
on conflict (zone_id, name) do nothing;

-- Insert Stations for Zone 2 (Râșnov + Predeal)
insert into public.stations (id, zone_id, name, code) values
  ('a2222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Râșnov', 'ST-RSN'),
  ('a2222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Predeal', 'ST-PRD')
on conflict (zone_id, name) do nothing;

-- Insert Stations for Zone 3 (Codlea + Feldioara)
insert into public.stations (id, zone_id, name, code) values
  ('a3333333-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Codlea', 'ST-CDL'),
  ('a3333333-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Feldioara', 'ST-FLD')
on conflict (zone_id, name) do nothing;

-- Insert Stations for Zone 4 (Victoria + Făgăraș)
insert into public.stations (id, zone_id, name, code) values
  ('a4444444-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Făgăraș', 'ST-FAG'),
  ('a4444444-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'Victoria', 'ST-VIC')
on conflict (zone_id, name) do nothing;

-- Insert Stations for Zone 5 (Rupea)
insert into public.stations (id, zone_id, name, code) values
  ('a5555555-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'Rupea', 'ST-RUP')
on conflict (zone_id, name) do nothing;

-- Insert 20 kV Lines for Stația Prejmer (Zone 1)
insert into public.lines (id, station_id, name, voltage_kv) values
  ('b1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 'Întorsura', 20),
  ('b1111111-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000001', 'Hărman', 20),
  ('b1111111-0000-0000-0000-000000000003', 'a1111111-0000-0000-0000-000000000001', 'Zizin', 20),
  ('b1111111-0000-0000-0000-000000000004', 'a1111111-0000-0000-0000-000000000001', 'Ozun', 20)
on conflict (station_id, name) do nothing;

-- Insert 20 kV Lines for other stations
insert into public.lines (id, station_id, name, voltage_kv) values
  ('b2222222-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000001', 'Linia Chei', 20),
  ('b3333333-0000-0000-0000-000000000001', 'a3333333-0000-0000-0000-000000000001', 'Linia Ghimbav', 20),
  ('b4444444-0000-0000-0000-000000000001', 'a4444444-0000-0000-0000-000000000001', 'Linia Combinat', 20),
  ('b5555555-0000-0000-0000-000000000001', 'a5555555-0000-0000-0000-000000000001', 'Linia Homorod', 20)
on conflict (station_id, name) do nothing;

-- Insert Equipment for Linia Întorsura (Stația Prejmer)
insert into public.equipment (equipment_code, name, equipment_type, line_id, locality, latitude, longitude, official_observations, is_unavailable, unavailable_reason) values
  ('SEP-20-INT-01', 'Separator MT 20kV Întorsura 1', 'Separator', 'b1111111-0000-0000-0000-000000000001', 'Prejmer', 45.722514, 25.776318, 'Acces direct din drumul principal, stâlp metalic.', false, null),
  ('SEP-20-INT-04', 'Separator MT 20kV Întorsura 4', 'Separator', 'b1111111-0000-0000-0000-000000000001', 'Prejmer', 45.728920, 25.789140, 'Acces dintr-un drum lateral pietruit, la 150m de lizieră.', false, null),
  ('PT-20-INT-02', 'PT 122 Întorsura', 'PT', 'b1111111-0000-0000-0000-000000000001', 'Prejmer', 45.731400, 25.782100, 'Post aerian pe stâlp de beton.', false, null),
  ('PT-20-INT-05', 'PT 125 Întorsura', 'PT', 'b1111111-0000-0000-0000-000000000001', 'Lunca Câlnicului', 45.738100, 25.801200, 'Acces dificil pe timp de ploaie prin teren agricol.', false, null),
  ('PCT-20-INT-01', 'PCT 14 Întorsura', 'PCT', 'b1111111-0000-0000-0000-000000000001', 'Prejmer', 45.726200, 25.779400, 'Punct de conexiuni în anvelopă de beton.', true, 'Mecanism de acționare blocat. Necesită înlocuire celulă.'),
  ('SEP-20-INT-08', 'Separator MT 20kV Ramificație Pod', 'Separator', 'b1111111-0000-0000-0000-000000000001', 'Prejmer', 45.734500, 25.794200, 'Lipsă manetă acționare manuală conform ultimei revizii.', false, null)
on conflict (equipment_code) do nothing;

-- Insert Equipment for Linia Hărman (Stația Prejmer)
insert into public.equipment (equipment_code, name, equipment_type, line_id, locality, latitude, longitude, official_observations, is_unavailable, unavailable_reason) values
  ('PT-20-HAR-01', 'PT 1 Hărman Centru', 'PT', 'b1111111-0000-0000-0000-000000000002', 'Hărman', 45.711200, 25.688100, 'Post zidit lângă primărie.', false, null),
  ('SEP-20-HAR-02', 'Separator MT 20kV Hărman Gară', 'Separator', 'b1111111-0000-0000-0000-000000000002', 'Hărman', 45.719800, 25.694500, null, false, null)
on conflict (equipment_code) do nothing;
