import { createClient as createServerSupabase } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import { AuthSessionUser } from './auth';
import fs from 'node:fs';
import path from 'node:path';
import {
  Zone,
  Station,
  Line20kV,
  Equipment,
  Observation,
  AuditLog,
  ParsedFeature,
} from './types';

// In-memory fallback dataset for robust operation / local testing / offline state
const SEED_ZONES: Zone[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Săcele + Prejmer', code: 'Z-SP', description: 'Zona operativă Săcele – Prejmer', created_at: new Date().toISOString() },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Râșnov + Predeal', code: 'Z-RP', description: 'Zona operativă Râșnov – Predeal', created_at: new Date().toISOString() },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Codlea + Feldioara', code: 'Z-CF', description: 'Zona operativă Codlea – Feldioara', created_at: new Date().toISOString() },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Victoria + Făgăraș', code: 'Z-VF', description: 'Zona operativă Victoria – Făgăraș', created_at: new Date().toISOString() },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Rupea', code: 'Z-RU', description: 'Zona operativă Rupea', created_at: new Date().toISOString() },
];

const SEED_STATIONS: Station[] = [
  { id: 'a1111111-0000-0000-0000-000000000001', zone_id: '11111111-1111-1111-1111-111111111111', name: 'Prejmer', code: 'ST-PRJ', created_at: new Date().toISOString() },
  { id: 'a1111111-0000-0000-0000-000000000002', zone_id: '11111111-1111-1111-1111-111111111111', name: 'Săcele', code: 'ST-SAC', created_at: new Date().toISOString() },
  { id: 'a2222222-0000-0000-0000-000000000001', zone_id: '22222222-2222-2222-2222-222222222222', name: 'Râșnov', code: 'ST-RSN', created_at: new Date().toISOString() },
  { id: 'a2222222-0000-0000-0000-000000000002', zone_id: '22222222-2222-2222-2222-222222222222', name: 'Predeal', code: 'ST-PRD', created_at: new Date().toISOString() },
  { id: 'a3333333-0000-0000-0000-000000000001', zone_id: '33333333-3333-3333-3333-333333333333', name: 'Codlea', code: 'ST-CDL', created_at: new Date().toISOString() },
  { id: 'a3333333-0000-0000-0000-000000000002', zone_id: '33333333-3333-3333-3333-333333333333', name: 'Feldioara', code: 'ST-FLD', created_at: new Date().toISOString() },
  { id: 'a4444444-0000-0000-0000-000000000001', zone_id: '44444444-4444-4444-4444-444444444444', name: 'Făgăraș', code: 'ST-FAG', created_at: new Date().toISOString() },
  { id: 'a4444444-0000-0000-0000-000000000002', zone_id: '44444444-4444-4444-4444-444444444444', name: 'Victoria', code: 'ST-VIC', created_at: new Date().toISOString() },
  { id: 'a5555555-0000-0000-0000-000000000001', zone_id: '55555555-5555-5555-5555-555555555555', name: 'Rupea', code: 'ST-RUP', created_at: new Date().toISOString() },
];

const SEED_LINES: Line20kV[] = [
  { id: 'b1111111-0000-0000-0000-000000000001', station_id: 'a1111111-0000-0000-0000-000000000001', name: 'Întorsura', voltage_kv: 20, code: 'L-INT', created_at: new Date().toISOString() },
  { id: 'b1111111-0000-0000-0000-000000000002', station_id: 'a1111111-0000-0000-0000-000000000001', name: 'Hărman', voltage_kv: 20, code: 'L-HAR', created_at: new Date().toISOString() },
  { id: 'b1111111-0000-0000-0000-000000000003', station_id: 'a1111111-0000-0000-0000-000000000001', name: 'Zizin', voltage_kv: 20, code: 'L-ZIZ', created_at: new Date().toISOString() },
  { id: 'b1111111-0000-0000-0000-000000000004', station_id: 'a1111111-0000-0000-0000-000000000001', name: 'Ozun', voltage_kv: 20, code: 'L-OZN', created_at: new Date().toISOString() },
  { id: 'b2222222-0000-0000-0000-000000000001', station_id: 'a2222222-0000-0000-0000-000000000001', name: 'Linia Chei', voltage_kv: 20, code: 'L-CHE', created_at: new Date().toISOString() },
  { id: 'b3333333-0000-0000-0000-000000000001', station_id: 'a3333333-0000-0000-0000-000000000001', name: 'Linia Ghimbav', voltage_kv: 20, code: 'L-GHI', created_at: new Date().toISOString() },
  { id: 'b4444444-0000-0000-0000-000000000001', station_id: 'a4444444-0000-0000-0000-000000000001', name: 'Linia Combinat', voltage_kv: 20, code: 'L-COM', created_at: new Date().toISOString() },
  { id: 'b5555555-0000-0000-0000-000000000001', station_id: 'a5555555-0000-0000-0000-000000000001', name: 'Linia Homorod', voltage_kv: 20, code: 'L-HOM', created_at: new Date().toISOString() },
];

const SEED_EQUIPMENT: Equipment[] = [
  {
    id: 'eq-01',
    equipment_code: 'SEP-20-INT-01',
    name: 'Separator MT 20kV Întorsura 1',
    equipment_type: 'Separator',
    line_id: 'b1111111-0000-0000-0000-000000000001',
    locality: 'Prejmer',
    latitude: 45.722514,
    longitude: 25.776318,
    official_observations: 'Acces direct din drumul principal, stâlp metalic.',
    is_unavailable: false,
    unavailable_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'eq-04',
    equipment_code: 'SEP-20-INT-04',
    name: 'Separator MT 20kV Întorsura 4',
    equipment_type: 'Separator',
    line_id: 'b1111111-0000-0000-0000-000000000001',
    locality: 'Prejmer',
    latitude: 45.72892,
    longitude: 25.78914,
    official_observations: 'Acces dintr-un drum lateral pietruit, la 150m de lizieră.',
    is_unavailable: false,
    unavailable_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'eq-02',
    equipment_code: 'PT-20-INT-02',
    name: 'PT 122 Întorsura',
    equipment_type: 'PT',
    line_id: 'b1111111-0000-0000-0000-000000000001',
    locality: 'Prejmer',
    latitude: 45.7314,
    longitude: 25.7821,
    official_observations: 'Post aerian pe stâlp de beton.',
    is_unavailable: false,
    unavailable_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'eq-05',
    equipment_code: 'PT-20-INT-05',
    name: 'PT 125 Întorsura',
    equipment_type: 'PT',
    line_id: 'b1111111-0000-0000-0000-000000000001',
    locality: 'Lunca Câlnicului',
    latitude: 45.7381,
    longitude: 25.8012,
    official_observations: 'Acces dificil pe timp de ploaie prin teren agricol.',
    is_unavailable: false,
    unavailable_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'eq-03',
    equipment_code: 'PCT-20-INT-01',
    name: 'PCT 14 Întorsura',
    equipment_type: 'PCT',
    line_id: 'b1111111-0000-0000-0000-000000000001',
    locality: 'Prejmer',
    latitude: 45.7262,
    longitude: 25.7794,
    official_observations: 'Punct de conexiuni în anvelopă de beton.',
    is_unavailable: true, // RED STATUS example from PDF
    unavailable_reason: 'Mecanism de acționare blocat. Necesită înlocuire celulă.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'eq-06',
    equipment_code: 'SEP-20-INT-08',
    name: 'Separator MT 20kV Ramificație Pod',
    equipment_type: 'Separator',
    line_id: 'b1111111-0000-0000-0000-000000000001',
    locality: 'Prejmer',
    latitude: 45.7345,
    longitude: 25.7942,
    official_observations: 'Lipsă manetă acționare manuală conform ultimei revizii.',
    is_unavailable: false,
    unavailable_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'eq-07',
    equipment_code: 'PT-20-HAR-01',
    name: 'PT 1 Hărman Centru',
    equipment_type: 'PT',
    line_id: 'b1111111-0000-0000-0000-000000000002',
    locality: 'Hărman',
    latitude: 45.7112,
    longitude: 25.6881,
    official_observations: 'Post zidit lângă primărie.',
    is_unavailable: false,
    unavailable_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_OBSERVATIONS: Observation[] = [
  {
    id: 'obs-01',
    equipment_id: 'eq-04',
    author_id: 'user-elec-01',
    text: 'Vegetație abundentă la baza stâlpului separatorului. Necesită defrișare pentru acces sigur.',
    category: 'acces',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

const SEED_AUDIT: AuditLog[] = [
  {
    id: 'audit-01',
    user_id: 'admin-01',
    action_type: 'status_change',
    entity_type: 'equipment',
    entity_id: 'eq-03',
    details: { reason: 'Mecanism de acționare blocat', status: 'unavailable' },
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'network_db.json');

export function saveStoreToDisk(store: any) {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Eroare la salvarea pe disc a bazei de date locale:', err);
  }
}

export interface DatabaseStore {
  zones: Zone[];
  stations: Station[];
  lines: Line20kV[];
  equipment: Equipment[];
  observations: Observation[];
  auditLogs: AuditLog[];
}

// Global in-memory storage (singleton in Node.js runtime)
declare global {
  var __EG_DB: DatabaseStore | undefined;
}

function getMemoryStore(): DatabaseStore {
  if (!global.__EG_DB) {
    let loaded = null;
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        loaded = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Nu s-a putut citi fișierul local network_db.json, se inițializează din seed:', e);
    }

    if (loaded && loaded.equipment && loaded.zones) {
      global.__EG_DB = loaded;
    } else {
      global.__EG_DB = {
        zones: [...SEED_ZONES],
        stations: [...SEED_STATIONS],
        lines: [...SEED_LINES],
        equipment: [...SEED_EQUIPMENT],
        observations: [...SEED_OBSERVATIONS],
        auditLogs: [...SEED_AUDIT],
      };
      saveStoreToDisk(global.__EG_DB);
    }
  }
  return global.__EG_DB!;
}

function hasSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project')
  );
}

// ==============================================================================
// DATA ACCESS LAYER
// ==============================================================================

export async function getZones(user: AuthSessionUser): Promise<Zone[]> {
  if (hasSupabase()) {
    try {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase.from('zones').select('*').order('name');
      if (!error && data) return data as Zone[];
    } catch (e) {
      console.warn('Supabase getZones failed, using store:', e);
    }
  }

  const store = getMemoryStore();
  if (user.role === 'admin') {
    return store.zones;
  }
  // Electrician only gets assigned zone
  return store.zones.filter((z) => z.id === user.assigned_zone_id);
}

export async function getStations(zoneId: string, user: AuthSessionUser): Promise<Station[]> {
  // Electrician permission check
  if (user.role !== 'admin' && user.assigned_zone_id !== zoneId) {
    return [];
  }

  if (hasSupabase()) {
    try {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('zone_id', zoneId)
        .order('name');
      if (!error && data) return data as Station[];
    } catch (e) {
      console.warn('Supabase getStations failed, using store:', e);
    }
  }

  const store = getMemoryStore();
  return store.stations.filter((s) => s.zone_id === zoneId);
}

export async function getLines(stationId: string, user: AuthSessionUser): Promise<Line20kV[]> {
  const store = getMemoryStore();
  const station = store.stations.find((s) => s.id === stationId);
  if (!station) return [];

  // Electrician permission check
  if (user.role !== 'admin' && user.assigned_zone_id !== station.zone_id) {
    return [];
  }

  if (hasSupabase()) {
    try {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from('lines')
        .select('*')
        .eq('station_id', stationId)
        .order('name');
      if (!error && data) return data as Line20kV[];
    } catch (e) {
      console.warn('Supabase getLines failed, using store:', e);
    }
  }

  return store.lines.filter((l) => l.station_id === stationId);
}

/**
 * CRITICAL PDF REQUIREMENT:
 * "Regulă importantă: lista tuturor echipamentelor nu este afișată automat.
 * Stația și linia trebuie selectate înainte de afișarea listei,
 * deoarece denumiri identice pot exista pe linii sau în zone diferite."
 */
export async function getEquipmentByLine(
  stationId: string,
  lineId: string,
  user: AuthSessionUser,
  filters?: { search?: string; type?: string }
): Promise<Equipment[]> {
  if (!stationId || !lineId) {
    return [];
  }

  const store = getMemoryStore();
  const station = store.stations.find((s) => s.id === stationId);
  if (!station) return [];

  // Check zone authorization
  if (user.role !== 'admin' && user.assigned_zone_id !== station.zone_id) {
    return [];
  }

  let items: Equipment[] = [];

  if (hasSupabase()) {
    try {
      const supabase = await createServerSupabase();
      let query = supabase
        .from('equipment')
        .select(`
          *,
          line:lines(
            *,
            station:stations(
              *,
              zone:zones(*)
            )
          )
        `)
        .eq('line_id', lineId);

      if (filters?.type && filters.type !== 'Toate') {
        query = query.eq('equipment_type', filters.type);
      }

      const { data, error } = await query.order('name');
      if (!error && data) {
        items = data as Equipment[];
      }
    } catch (e) {
      console.warn('Supabase getEquipmentByLine failed, using store:', e);
    }
  }

  if (!items.length) {
    items = store.equipment.filter((e) => e.line_id === lineId);
    if (filters?.type && filters.type !== 'Toate') {
      items = items.filter((e) => e.equipment_type.toLowerCase() === filters.type?.toLowerCase());
    }
  }

  // Count pending observations for each equipment item
  const observations = store.observations;
  items = items.map((e) => {
    const pendingCount = observations.filter(
      (o) => o.equipment_id === e.id && (o.status === 'pending' || o.status === 'needs_verification')
    ).length;

    // Attach line/station/zone relation if not already populated
    if (!e.line) {
      const line = store.lines.find((l) => l.id === e.line_id);
      const st = line ? store.stations.find((s) => s.id === line.station_id) : undefined;
      const zn = st ? store.zones.find((z) => z.id === st.zone_id) : undefined;
      return {
        ...e,
        pending_observations_count: pendingCount,
        line: line ? { ...line, station: st ? { ...st, zone: zn } : undefined } : undefined,
      };
    }

    return { ...e, pending_observations_count: pendingCount };
  });

  // Apply search query if provided
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    items = items.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.equipment_code.toLowerCase().includes(q) ||
        (e.locality && e.locality.toLowerCase().includes(q))
    );
  }

  return items;
}

export async function getEquipmentById(
  equipmentId: string,
  user: AuthSessionUser
): Promise<{ equipment: Equipment; observations: Observation[] } | null> {
  const store = getMemoryStore();
  const eq = store.equipment.find((e) => e.id === equipmentId);
  if (!eq) return null;

  const line = store.lines.find((l) => l.id === eq.line_id);
  const station = line ? store.stations.find((s) => s.id === line.station_id) : undefined;
  const zone = station ? store.zones.find((z) => z.id === station.zone_id) : undefined;

  // Authorization check
  if (user.role !== 'admin' && user.assigned_zone_id !== station?.zone_id) {
    return null;
  }

  const eqObservations = store.observations.filter((o) => o.equipment_id === equipmentId);
  const pendingCount = eqObservations.filter((o) => o.status === 'pending' || o.status === 'needs_verification').length;

  const populatedEquipment: Equipment = {
    ...eq,
    pending_observations_count: pendingCount,
    line: line ? { ...line, station: station ? { ...station, zone } : undefined } : undefined,
  };

  return {
    equipment: populatedEquipment,
    observations: eqObservations,
  };
}

export async function submitObservation(
  equipmentId: string,
  text: string,
  category: Observation['category'],
  user: AuthSessionUser
): Promise<Observation> {
  const store = getMemoryStore();
  const eq = store.equipment.find((e) => e.id === equipmentId);
  if (!eq) throw new Error('Echipamentul nu există.');

  const newObs: Observation = {
    id: 'obs-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    equipment_id: equipmentId,
    author_id: user.id,
    text: text.trim(),
    category,
    status: 'pending',
    created_at: new Date().toISOString(),
    author: {
      id: user.id,
      username: user.username,
      role: user.role,
      assigned_zone_id: user.assigned_zone_id,
      full_name: user.full_name,
      created_at: new Date().toISOString(),
    },
  };

  store.observations.unshift(newObs);

  // Log in modification history
  store.auditLogs.unshift({
    id: 'audit-' + Date.now(),
    user_id: user.id,
    action_type: 'observation_submit',
    entity_type: 'observation',
    entity_id: newObs.id,
    details: { equipment_id: equipmentId, text: newObs.text, category },
    created_at: new Date().toISOString(),
  });

  saveStoreToDisk(store);

  return newObs;
}

export async function reviewObservation(
  observationId: string,
  action: 'approve' | 'reject' | 'needs_verification',
  adminNotes: string | null,
  updateOfficialNotes: boolean,
  adminUser: AuthSessionUser
): Promise<Observation> {
  if (adminUser.role !== 'admin') {
    throw new Error('Doar administratorul poate valida sau respinge observații.');
  }

  const store = getMemoryStore();
  const obsIndex = store.observations.findIndex((o) => o.id === observationId);
  if (obsIndex === -1) throw new Error('Observația nu a fost găsită.');

  const obs = store.observations[obsIndex];
  const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_verification';

  obs.status = newStatus;
  obs.admin_notes = adminNotes;
  obs.reviewed_by = adminUser.id;
  obs.reviewed_at = new Date().toISOString();

  // If approved and admin chooses to promote to official equipment notes
  if (action === 'approve' && updateOfficialNotes) {
    const eq = store.equipment.find((e) => e.id === obs.equipment_id);
    if (eq) {
      const existing = eq.official_observations ? `${eq.official_observations}\n` : '';
      eq.official_observations = `${existing}[Validat ${new Date().toLocaleDateString('ro-RO')}]: ${obs.text}`;
      eq.updated_at = new Date().toISOString();
    }
  }

  // Audit log
  store.auditLogs.unshift({
    id: 'audit-' + Date.now(),
    user_id: adminUser.id,
    action_type: 'observation_review',
    entity_type: 'observation',
    entity_id: obs.id,
    details: { action, adminNotes, equipment_id: obs.equipment_id },
    created_at: new Date().toISOString(),
  });

  saveStoreToDisk(store);

  return obs;
}

export async function updateEquipmentAvailability(
  equipmentId: string,
  isUnavailable: boolean,
  reason: string | null,
  adminUser: AuthSessionUser
): Promise<Equipment> {
  if (adminUser.role !== 'admin') {
    throw new Error('Doar administratorul poate declara indisponibilitatea.');
  }

  const store = getMemoryStore();
  const eq = store.equipment.find((e) => e.id === equipmentId);
  if (!eq) throw new Error('Echipamentul nu există.');

  eq.is_unavailable = isUnavailable;
  eq.unavailable_reason = isUnavailable ? (reason?.trim() || 'Marcat indisponibil de administrator.') : null;
  eq.updated_at = new Date().toISOString();

  store.auditLogs.unshift({
    id: 'audit-' + Date.now(),
    user_id: adminUser.id,
    action_type: 'status_change',
    entity_type: 'equipment',
    entity_id: equipmentId,
    details: { is_unavailable: isUnavailable, reason: eq.unavailable_reason },
    created_at: new Date().toISOString(),
  });

  saveStoreToDisk(store);

  return eq;
}

export async function getPendingObservations(adminUser: AuthSessionUser): Promise<Observation[]> {
  if (adminUser.role !== 'admin') return [];

  const store = getMemoryStore();
  const pending = store.observations.filter(
    (o) => o.status === 'pending' || o.status === 'needs_verification'
  );

  return pending.map((obs) => {
    const eq = store.equipment.find((e) => e.id === obs.equipment_id);
    const line = eq ? store.lines.find((l) => l.id === eq.line_id) : undefined;
    const station = line ? store.stations.find((s) => s.id === line.station_id) : undefined;
    const zone = station ? store.zones.find((z) => z.id === station.zone_id) : undefined;

    return {
      ...obs,
      equipment: eq
        ? {
            ...eq,
            line: line ? { ...line, station: station ? { ...station, zone } : undefined } : undefined,
          }
        : undefined,
    };
  });
}

export async function getAuditHistory(adminUser: AuthSessionUser, limit = 50): Promise<AuditLog[]> {
  if (adminUser.role !== 'admin') return [];
  const store = getMemoryStore();
  return store.auditLogs.slice(0, limit);
}

export async function createEquipment(
  data: {
    equipment_code: string;
    name: string;
    equipment_type: string;
    line_id: string;
    locality?: string;
    latitude: number;
    longitude: number;
    official_observations?: string;
  },
  adminUser: AuthSessionUser
): Promise<Equipment> {
  if (adminUser.role !== 'admin') throw new Error('Acces neautorizat.');

  const store = getMemoryStore();
  const exists = store.equipment.some(
    (e) => e.equipment_code.toLowerCase() === data.equipment_code.trim().toLowerCase()
  );
  if (exists) {
    throw new Error(`ID-ul de echipament ${data.equipment_code} există deja în rețea.`);
  }

  const newEq: Equipment = {
    id: 'eq-' + Date.now(),
    equipment_code: data.equipment_code.trim(),
    name: data.name.trim(),
    equipment_type: data.equipment_type.trim() || 'PT',
    line_id: data.line_id,
    locality: data.locality?.trim() || null,
    latitude: data.latitude,
    longitude: data.longitude,
    official_observations: data.official_observations?.trim() || null,
    is_unavailable: false,
    unavailable_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  store.equipment.push(newEq);

  store.auditLogs.unshift({
    id: 'audit-' + Date.now(),
    user_id: adminUser.id,
    action_type: 'equipment_create',
    entity_type: 'equipment',
    entity_id: newEq.id,
    details: { code: newEq.equipment_code, name: newEq.name },
    created_at: new Date().toISOString(),
  });

  saveStoreToDisk(store);

  return newEq;
}

export async function updateEquipment(
  id: string,
  data: {
    name: string;
    equipment_type: string;
    line_id: string;
    locality?: string;
    latitude: number;
    longitude: number;
    official_observations?: string;
  },
  adminUser: AuthSessionUser
): Promise<Equipment> {
  if (adminUser.role !== 'admin') throw new Error('Acces neautorizat.');

  const store = getMemoryStore();
  const eq = store.equipment.find((e) => e.id === id);
  if (!eq) throw new Error('Echipamentul nu a fost găsit.');

  eq.name = data.name.trim();
  eq.equipment_type = data.equipment_type.trim();
  eq.line_id = data.line_id;
  eq.locality = data.locality?.trim() || null;
  eq.latitude = data.latitude;
  eq.longitude = data.longitude;
  eq.official_observations = data.official_observations?.trim() || null;
  eq.updated_at = new Date().toISOString();

  store.auditLogs.unshift({
    id: 'audit-' + Date.now(),
    user_id: adminUser.id,
    action_type: 'equipment_update',
    entity_type: 'equipment',
    entity_id: id,
    details: { code: eq.equipment_code, name: eq.name },
    created_at: new Date().toISOString(),
  });

  saveStoreToDisk(store);

  return eq;
}

export async function deleteEquipment(id: string, adminUser: AuthSessionUser): Promise<void> {
  if (adminUser.role !== 'admin') throw new Error('Acces neautorizat.');

  const store = getMemoryStore();
  const idx = store.equipment.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('Echipamentul nu a fost găsit.');

  const [removed] = store.equipment.splice(idx, 1);

  store.auditLogs.unshift({
    id: 'audit-' + Date.now(),
    user_id: adminUser.id,
    action_type: 'equipment_delete',
    entity_type: 'equipment',
    entity_id: id,
    details: { code: removed.equipment_code, name: removed.name },
    created_at: new Date().toISOString(),
  });

  saveStoreToDisk(store);
}

