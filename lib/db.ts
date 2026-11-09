import { createClient as createServerSupabase } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import { AuthSessionUser } from './auth';
import {
  Zone,
  Station,
  Line20kV,
  Equipment,
  Observation,
  AuditLog,
} from './types';

// ==============================================================================
// DATA ACCESS LAYER — Pure Supabase (no local storage fallback)
// All reads/writes go exclusively through Supabase.
// RLS enforced at database level; server-side client carries the user's session.
// ==============================================================================

async function userClient() {
  return createServerSupabase();
}

// ==============================================================================
// ZONE
// ==============================================================================

export async function getZones(user: AuthSessionUser): Promise<Zone[]> {
  const supabase = await userClient();
  const { data, error } = await supabase.from('zones').select('*').order('name');
  if (error) throw new Error(`getZones: ${error.message}`);
  return (data ?? []) as Zone[];
}

// ==============================================================================
// STATIONS
// ==============================================================================

export async function getStations(zoneId: string, user: AuthSessionUser): Promise<Station[]> {
  if (!zoneId) return [];
  const supabase = await userClient();
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('zone_id', zoneId)
    .order('name');
  if (error) throw new Error(`getStations: ${error.message}`);
  return (data ?? []) as Station[];
}

// ==============================================================================
// LINES
// ==============================================================================

export async function getLines(stationId: string, user: AuthSessionUser): Promise<Line20kV[]> {
  if (!stationId) return [];
  const supabase = await userClient();
  const { data, error } = await supabase
    .from('lines')
    .select('*')
    .eq('station_id', stationId)
    .order('name');
  if (error) throw new Error(`getLines: ${error.message}`);
  return (data ?? []) as Line20kV[];
}

// ==============================================================================
// EQUIPMENT
// ==============================================================================

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

  const supabase = await userClient();

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
  if (error) throw new Error(`getEquipmentByLine: ${error.message}`);

  let items = (data ?? []) as Equipment[];

  // Fetch pending observation counts for status badges
  if (items.length > 0) {
    const equipmentIds = items.map((e) => e.id);
    const { data: obsData } = await supabase
      .from('observations')
      .select('equipment_id')
      .in('equipment_id', equipmentIds)
      .in('status', ['pending', 'needs_verification']);

    const countMap: Record<string, number> = {};
    for (const obs of obsData ?? []) {
      countMap[obs.equipment_id] = (countMap[obs.equipment_id] || 0) + 1;
    }

    items = items.map((e) => ({
      ...e,
      pending_observations_count: countMap[e.id] || 0,
    }));
  }

  // Apply text search (client-side after DB fetch to support diacritics properly)
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
  if (!equipmentId) return null;

  const supabase = await userClient();

  const { data: eq, error: eqErr } = await supabase
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
    .eq('id', equipmentId)
    .single();

  if (eqErr || !eq) return null;

  const { data: observations, error: obsErr } = await supabase
    .from('observations')
    .select('*, author:profiles!author_id(id, username, full_name, role), reviewer:profiles!reviewed_by(id, username, full_name)')
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false });

  if (obsErr) throw new Error(`getEquipmentById observations: ${obsErr.message}`);

  const obsArray = (observations ?? []) as Observation[];
  const pendingCount = obsArray.filter(
    (o) => o.status === 'pending' || o.status === 'needs_verification'
  ).length;

  const equipment: Equipment = {
    ...(eq as Equipment),
    pending_observations_count: pendingCount,
  };

  return { equipment, observations: obsArray };
}

// ==============================================================================
// OBSERVATIONS
// ==============================================================================

export async function submitObservation(
  equipmentId: string,
  text: string,
  category: Observation['category'],
  user: AuthSessionUser
): Promise<Observation> {
  const supabase = await userClient();

  const { data, error } = await supabase
    .from('observations')
    .insert({
      equipment_id: equipmentId,
      author_id: user.id,
      text: text.trim(),
      category,
      status: 'pending',
    })
    .select('*, author:profiles!author_id(id, username, full_name, role)')
    .single();

  if (error) throw new Error(`submitObservation: ${error.message}`);

  // Audit log
  await supabase.from('modification_history').insert({
    user_id: user.id,
    action_type: 'observation_submit',
    entity_type: 'observation',
    entity_id: data.id,
    details: { equipment_id: equipmentId, text: text.trim(), category },
  });

  return data as Observation;
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

  const supabase = await userClient();
  const newStatus =
    action === 'approve'
      ? 'approved'
      : action === 'reject'
      ? 'rejected'
      : 'needs_verification';

  // Fetch the observation first
  const { data: obs, error: fetchErr } = await supabase
    .from('observations')
    .select('*')
    .eq('id', observationId)
    .single();
  if (fetchErr || !obs) throw new Error('Observația nu a fost găsită.');

  const { data: updated, error } = await supabase
    .from('observations')
    .update({
      status: newStatus,
      admin_notes: adminNotes,
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', observationId)
    .select('*')
    .single();

  if (error) throw new Error(`reviewObservation: ${error.message}`);

  // If approved and admin wants to promote to official equipment notes
  if (action === 'approve' && updateOfficialNotes) {
    const { data: eq } = await supabase
      .from('equipment')
      .select('official_observations')
      .eq('id', obs.equipment_id)
      .single();

    if (eq) {
      const existing = eq.official_observations ? `${eq.official_observations}\n` : '';
      const newNotes = `${existing}[Validat ${new Date().toLocaleDateString('ro-RO')}]: ${obs.text}`;
      await supabase
        .from('equipment')
        .update({ official_observations: newNotes, updated_at: new Date().toISOString() })
        .eq('id', obs.equipment_id);
    }
  }

  // Audit log
  await supabase.from('modification_history').insert({
    user_id: adminUser.id,
    action_type: 'observation_review',
    entity_type: 'observation',
    entity_id: observationId,
    details: { action, adminNotes, equipment_id: obs.equipment_id },
  });

  return updated as Observation;
}

// ==============================================================================
// EQUIPMENT AVAILABILITY
// ==============================================================================

export async function updateEquipmentAvailability(
  equipmentId: string,
  isUnavailable: boolean,
  reason: string | null,
  adminUser: AuthSessionUser
): Promise<Equipment> {
  if (adminUser.role !== 'admin') {
    throw new Error('Doar administratorul poate declara indisponibilitatea.');
  }

  const supabase = await userClient();

  const { data, error } = await supabase
    .from('equipment')
    .update({
      is_unavailable: isUnavailable,
      unavailable_reason: isUnavailable
        ? (reason?.trim() || 'Marcat indisponibil de administrator.')
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', equipmentId)
    .select('*')
    .single();

  if (error) throw new Error(`updateEquipmentAvailability: ${error.message}`);

  await supabase.from('modification_history').insert({
    user_id: adminUser.id,
    action_type: 'status_change',
    entity_type: 'equipment',
    entity_id: equipmentId,
    details: { is_unavailable: isUnavailable, reason: reason ?? null },
  });

  return data as Equipment;
}

// ==============================================================================
// ADMIN: PENDING OBSERVATIONS
// ==============================================================================

export async function getPendingObservations(adminUser: AuthSessionUser): Promise<Observation[]> {
  if (adminUser.role !== 'admin') return [];

  const supabase = await userClient();
  const { data, error } = await supabase
    .from('observations')
    .select(`
      *,
      author:profiles!author_id(id, username, full_name, role),
      equipment:equipment(
        *,
        line:lines(
          *,
          station:stations(
            *,
            zone:zones(*)
          )
        )
      )
    `)
    .in('status', ['pending', 'needs_verification'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getPendingObservations: ${error.message}`);
  return (data ?? []) as Observation[];
}

// ==============================================================================
// ADMIN: AUDIT HISTORY
// ==============================================================================

export async function getAuditHistory(adminUser: AuthSessionUser, limit = 50): Promise<AuditLog[]> {
  if (adminUser.role !== 'admin') return [];

  const supabase = await userClient();
  const { data, error } = await supabase
    .from('modification_history')
    .select('*, user:profiles(username, full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getAuditHistory: ${error.message}`);
  return (data ?? []) as AuditLog[];
}

// ==============================================================================
// ADMIN: EQUIPMENT CRUD
// ==============================================================================

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

  const supabase = await userClient();

  // Check for duplicate code (case-insensitive)
  const { data: existing } = await supabase
    .from('equipment')
    .select('id')
    .ilike('equipment_code', data.equipment_code.trim())
    .maybeSingle();

  if (existing) {
    throw new Error(`ID-ul de echipament ${data.equipment_code} există deja în rețea.`);
  }

  const { data: created, error } = await supabase
    .from('equipment')
    .insert({
      equipment_code: data.equipment_code.trim(),
      name: data.name.trim(),
      equipment_type: data.equipment_type.trim() || 'PT',
      line_id: data.line_id,
      locality: data.locality?.trim() || null,
      latitude: data.latitude,
      longitude: data.longitude,
      official_observations: data.official_observations?.trim() || null,
      is_unavailable: false,
    })
    .select('*')
    .single();

  if (error) throw new Error(`createEquipment: ${error.message}`);

  await supabase.from('modification_history').insert({
    user_id: adminUser.id,
    action_type: 'equipment_create',
    entity_type: 'equipment',
    entity_id: created.id,
    details: { code: created.equipment_code, name: created.name },
  });

  return created as Equipment;
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

  const supabase = await userClient();

  const { data: updated, error } = await supabase
    .from('equipment')
    .update({
      name: data.name.trim(),
      equipment_type: data.equipment_type.trim(),
      line_id: data.line_id,
      locality: data.locality?.trim() || null,
      latitude: data.latitude,
      longitude: data.longitude,
      official_observations: data.official_observations?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(`updateEquipment: ${error.message}`);

  await supabase.from('modification_history').insert({
    user_id: adminUser.id,
    action_type: 'equipment_update',
    entity_type: 'equipment',
    entity_id: id,
    details: { code: updated.equipment_code, name: updated.name },
  });

  return updated as Equipment;
}

export async function deleteEquipment(id: string, adminUser: AuthSessionUser): Promise<void> {
  if (adminUser.role !== 'admin') throw new Error('Acces neautorizat.');

  const supabase = await userClient();

  // Fetch before delete for audit
  const { data: eq } = await supabase
    .from('equipment')
    .select('equipment_code, name')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('equipment').delete().eq('id', id);
  if (error) throw new Error(`deleteEquipment: ${error.message}`);

  await supabase.from('modification_history').insert({
    user_id: adminUser.id,
    action_type: 'equipment_delete',
    entity_type: 'equipment',
    entity_id: id,
    details: { code: eq?.equipment_code ?? id, name: eq?.name ?? '' },
  });
}

// ==============================================================================
// ADMIN: ALL EQUIPMENT (for management table)
// ==============================================================================

export async function getAllEquipment(adminUser: AuthSessionUser): Promise<Equipment[]> {
  if (adminUser.role !== 'admin') return [];

  const supabase = await userClient();
  const { data, error } = await supabase
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
    .order('name');

  if (error) throw new Error(`getAllEquipment: ${error.message}`);
  return (data ?? []) as Equipment[];
}
