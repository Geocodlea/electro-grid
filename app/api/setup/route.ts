import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// One-time database bootstrap endpoint
// Protected by a setup token — only accessible with the correct key
// DELETE this route after first use or add it to .gitignore output

const SETUP_TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) ?? '';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token || token !== SETUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results: { step: string; ok: boolean; error?: string }[] = [];

  // Helper to track results
  async function step(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.push({ step: name, ok: true });
    } catch (err: any) {
      results.push({ step: name, ok: false, error: err?.message });
    }
  }

  // ── ZONES ──────────────────────────────────────────────────────────────────
  await step('Insert zones', async () => {
    const { error } = await supabase.from('zones').upsert([
      { id: '11111111-1111-1111-1111-111111111111', name: 'Săcele + Prejmer', code: 'Z-SP', description: 'Zona operativă Săcele – Prejmer' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Râșnov + Predeal', code: 'Z-RP', description: 'Zona operativă Râșnov – Predeal' },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Codlea + Feldioara', code: 'Z-CF', description: 'Zona operativă Codlea – Feldioara' },
      { id: '44444444-4444-4444-4444-444444444444', name: 'Victoria + Făgăraș', code: 'Z-VF', description: 'Zona operativă Victoria – Făgăraș' },
      { id: '55555555-5555-5555-5555-555555555555', name: 'Rupea', code: 'Z-RU', description: 'Zona operativă Rupea' },
    ], { onConflict: 'id' });
    if (error) throw error;
  });

  // ── PROFILES ───────────────────────────────────────────────────────────────
  await step('Insert profiles', async () => {
    const { error } = await supabase.from('profiles').upsert([
      { id: 'e897de4c-090a-4569-9a97-0f03cdad6cdb', username: 'admin', role: 'admin', assigned_zone_id: null, full_name: 'Ing. Administrator Rețea MT' },
      { id: '87bd2993-627e-43cd-b42c-240d839ac6b6', username: 'electrician_sacele', role: 'electrician', assigned_zone_id: '11111111-1111-1111-1111-111111111111', full_name: 'Electrician Formația Săcele–Prejmer' },
      { id: 'dd8fb4e9-392d-457b-ae86-030615684672', username: 'electrician_rasnov', role: 'electrician', assigned_zone_id: '22222222-2222-2222-2222-222222222222', full_name: 'Electrician Formația Râșnov–Predeal' },
      { id: '18c0f6ba-efcc-4610-b9a0-56d23e365198', username: 'electrician_codlea', role: 'electrician', assigned_zone_id: '33333333-3333-3333-3333-333333333333', full_name: 'Electrician Formația Codlea–Feldioara' },
    ], { onConflict: 'id' });
    if (error) throw error;
  });

  // ── STATIONS ───────────────────────────────────────────────────────────────
  await step('Insert stations', async () => {
    const { error } = await supabase.from('stations').upsert([
      { id: 'a1111111-0000-0000-0000-000000000001', zone_id: '11111111-1111-1111-1111-111111111111', name: 'Prejmer', code: 'ST-PRJ' },
      { id: 'a1111111-0000-0000-0000-000000000002', zone_id: '11111111-1111-1111-1111-111111111111', name: 'Săcele', code: 'ST-SAC' },
      { id: 'a2222222-0000-0000-0000-000000000001', zone_id: '22222222-2222-2222-2222-222222222222', name: 'Râșnov', code: 'ST-RSN' },
      { id: 'a2222222-0000-0000-0000-000000000002', zone_id: '22222222-2222-2222-2222-222222222222', name: 'Predeal', code: 'ST-PRD' },
      { id: 'a3333333-0000-0000-0000-000000000001', zone_id: '33333333-3333-3333-3333-333333333333', name: 'Codlea', code: 'ST-CDL' },
      { id: 'a3333333-0000-0000-0000-000000000002', zone_id: '33333333-3333-3333-3333-333333333333', name: 'Feldioara', code: 'ST-FLD' },
      { id: 'a4444444-0000-0000-0000-000000000001', zone_id: '44444444-4444-4444-4444-444444444444', name: 'Făgăraș', code: 'ST-FAG' },
      { id: 'a4444444-0000-0000-0000-000000000002', zone_id: '44444444-4444-4444-4444-444444444444', name: 'Victoria', code: 'ST-VIC' },
      { id: 'a5555555-0000-0000-0000-000000000001', zone_id: '55555555-5555-5555-5555-555555555555', name: 'Rupea', code: 'ST-RUP' },
    ], { onConflict: 'id' });
    if (error) throw error;
  });

  // ── LINES ──────────────────────────────────────────────────────────────────
  await step('Insert lines', async () => {
    const { error } = await supabase.from('lines').upsert([
      { id: 'b1111111-0000-0000-0000-000000000001', station_id: 'a1111111-0000-0000-0000-000000000001', name: 'Întorsura', voltage_kv: 20, code: 'L-INT' },
      { id: 'b1111111-0000-0000-0000-000000000002', station_id: 'a1111111-0000-0000-0000-000000000001', name: 'Hărman', voltage_kv: 20, code: 'L-HAR' },
      { id: 'b1111111-0000-0000-0000-000000000003', station_id: 'a1111111-0000-0000-0000-000000000001', name: 'Zizin', voltage_kv: 20, code: 'L-ZIZ' },
      { id: 'b1111111-0000-0000-0000-000000000004', station_id: 'a1111111-0000-0000-0000-000000000001', name: 'Ozun', voltage_kv: 20, code: 'L-OZN' },
      { id: 'b2222222-0000-0000-0000-000000000001', station_id: 'a2222222-0000-0000-0000-000000000001', name: 'Linia Chei', voltage_kv: 20, code: 'L-CHE' },
      { id: 'b3333333-0000-0000-0000-000000000001', station_id: 'a3333333-0000-0000-0000-000000000001', name: 'Linia Ghimbav', voltage_kv: 20, code: 'L-GHI' },
      { id: 'b4444444-0000-0000-0000-000000000001', station_id: 'a4444444-0000-0000-0000-000000000001', name: 'Linia Combinat', voltage_kv: 20, code: 'L-COM' },
      { id: 'b5555555-0000-0000-0000-000000000001', station_id: 'a5555555-0000-0000-0000-000000000001', name: 'Linia Homorod', voltage_kv: 20, code: 'L-HOM' },
    ], { onConflict: 'id' });
    if (error) throw error;
  });

  // ── EQUIPMENT ──────────────────────────────────────────────────────────────
  await step('Insert equipment', async () => {
    const { error } = await supabase.from('equipment').upsert([
      { id: 'eq-00000001-0000-0000-0000-000000000001', equipment_code: 'SEP-20-INT-01', name: 'Separator MT 20kV Întorsura 1', equipment_type: 'Separator', line_id: 'b1111111-0000-0000-0000-000000000001', locality: 'Prejmer', latitude: 45.722514, longitude: 25.776318, official_observations: 'Acces direct din drumul principal, stâlp metalic.', is_unavailable: false },
      { id: 'eq-00000001-0000-0000-0000-000000000004', equipment_code: 'SEP-20-INT-04', name: 'Separator MT 20kV Întorsura 4', equipment_type: 'Separator', line_id: 'b1111111-0000-0000-0000-000000000001', locality: 'Prejmer', latitude: 45.728920, longitude: 25.789140, official_observations: 'Acces dintr-un drum lateral pietruit, la 150m de lizieră.', is_unavailable: false },
      { id: 'eq-00000001-0000-0000-0000-000000000002', equipment_code: 'PT-20-INT-02', name: 'PT 122 Întorsura', equipment_type: 'PT', line_id: 'b1111111-0000-0000-0000-000000000001', locality: 'Prejmer', latitude: 45.731400, longitude: 25.782100, official_observations: 'Post aerian pe stâlp de beton.', is_unavailable: false },
      { id: 'eq-00000001-0000-0000-0000-000000000005', equipment_code: 'PT-20-INT-05', name: 'PT 125 Întorsura', equipment_type: 'PT', line_id: 'b1111111-0000-0000-0000-000000000001', locality: 'Lunca Câlnicului', latitude: 45.738100, longitude: 25.801200, official_observations: 'Acces dificil pe timp de ploaie prin teren agricol.', is_unavailable: false },
      { id: 'eq-00000001-0000-0000-0000-000000000003', equipment_code: 'PCT-20-INT-01', name: 'PCT 14 Întorsura', equipment_type: 'PCT', line_id: 'b1111111-0000-0000-0000-000000000001', locality: 'Prejmer', latitude: 45.726200, longitude: 25.779400, official_observations: 'Punct de conexiuni în anvelopă de beton.', is_unavailable: true, unavailable_reason: 'Mecanism de acționare blocat. Necesită înlocuire celulă.' },
      { id: 'eq-00000001-0000-0000-0000-000000000006', equipment_code: 'SEP-20-INT-08', name: 'Separator MT 20kV Ramificație Pod', equipment_type: 'Separator', line_id: 'b1111111-0000-0000-0000-000000000001', locality: 'Prejmer', latitude: 45.734500, longitude: 25.794200, official_observations: 'Lipsă manetă acționare manuală conform ultimei revizii.', is_unavailable: false },
      { id: 'eq-00000001-0000-0000-0000-000000000007', equipment_code: 'PT-20-HAR-01', name: 'PT 1 Hărman Centru', equipment_type: 'PT', line_id: 'b1111111-0000-0000-0000-000000000002', locality: 'Hărman', latitude: 45.711200, longitude: 25.688100, official_observations: 'Post zidit lângă primărie.', is_unavailable: false },
    ], { onConflict: 'equipment_code' });
    if (error) throw error;
  });

  // ── OBSERVATIONS ───────────────────────────────────────────────────────────
  await step('Insert initial observations', async () => {
    const { error } = await supabase.from('observations').upsert([
      {
        id: 'obs-00000001-0000-0000-0000-000000000001',
        equipment_id: 'eq-00000001-0000-0000-0000-000000000004',
        author_id: '87bd2993-627e-43cd-b42c-240d839ac6b6',
        text: 'Vegetație abundentă la baza stâlpului separatorului. Necesită defrișare pentru acces sigur.',
        category: 'acces',
        status: 'pending',
      },
    ], { onConflict: 'id' });
    if (error) throw error;
  });

  // ── AUDIT ──────────────────────────────────────────────────────────────────
  await step('Insert initial audit log', async () => {
    const { error } = await supabase.from('modification_history').upsert([
      {
        id: 'audit-00000001-0000-0000-0000-000000000001',
        user_id: 'e897de4c-090a-4569-9a97-0f03cdad6cdb',
        action_type: 'status_change',
        entity_type: 'equipment',
        entity_id: 'eq-00000001-0000-0000-0000-000000000003',
        details: { reason: 'Mecanism de acționare blocat', status: 'unavailable' },
      },
    ], { onConflict: 'id' });
    if (error) throw error;
  });

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({
    success: allOk,
    results,
    message: allOk
      ? 'All seed data applied successfully!'
      : 'Some steps failed — check results array.',
  });
}

