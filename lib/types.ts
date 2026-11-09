export type UserRole = 'admin' | 'electrician';

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  assigned_zone_id: string | null;
  full_name?: string | null;
  created_at: string;
}

export interface Zone {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  created_at: string;
}

export interface Station {
  id: string;
  zone_id: string;
  name: string;
  code?: string | null;
  created_at: string;
  // Joined relation
  zone?: Zone;
}

export interface Line20kV {
  id: string;
  station_id: string;
  name: string;
  voltage_kv: number;
  code?: string | null;
  created_at: string;
  // Joined relation
  station?: Station;
}

export type EquipmentStatusColor = 'green' | 'yellow' | 'red';

export interface EquipmentStatusInfo {
  color: EquipmentStatusColor;
  label: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  reason?: string;
}

export interface Equipment {
  id: string;
  equipment_code: string; // Unique ID required by PDF (e.g. PT-01-PRJ)
  name: string;
  equipment_type: string; // PT, PCT, Separator, etc.
  line_id: string;
  locality?: string | null;
  latitude: number;
  longitude: number;
  official_observations?: string | null;
  is_unavailable: boolean; // RED status when true
  unavailable_reason?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  line?: Line20kV & { station?: Station & { zone?: Zone } };
  pending_observations_count?: number;
}

export type ObservationStatus = 'pending' | 'approved' | 'rejected' | 'needs_verification';

export interface Observation {
  id: string;
  equipment_id: string;
  author_id: string;
  text: string;
  category: 'acces' | 'defect' | 'maneta_lipsa' | 'gps_gresit' | 'altele';
  status: ObservationStatus;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;

  // Joined relations
  equipment?: Equipment & {
    line?: Line20kV & {
      station?: Station & {
        zone?: Zone;
      };
    };
  };
  author?: Profile;
  reviewer?: Profile;
}

export type AuditActionType =
  | 'equipment_create'
  | 'equipment_update'
  | 'equipment_delete'
  | 'status_change'
  | 'observation_submit'
  | 'observation_review'
  | 'network_import'
  | 'manual_entry';

export interface AuditLog {
  id: string;
  user_id: string;
  action_type: AuditActionType;
  entity_type: 'equipment' | 'observation' | 'zone' | 'station' | 'line' | 'import';
  entity_id?: string | null;
  details: Record<string, any>;
  created_at: string;

  // Joined relations
  user?: Profile;
}

export interface ParsedFeature {
  tempId: string;
  name: string;
  equipmentCode?: string;
  equipmentType?: string;
  description?: string;
  latitude: number | null;
  longitude: number | null;
  zoneName?: string;
  stationName?: string;
  lineName?: string;
  locality?: string;
  officialObservations?: string;
  isUnavailable?: boolean;
  unavailableReason?: string;
  rawAttributes?: Record<string, any>;
  // Validation state
  isValid: boolean;
  validationErrors: string[];
  isDuplicateInDB?: boolean;
  isDuplicateInFile?: boolean;
}

export interface ImportPreviewSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  updates: number;
  features: ParsedFeature[];
}
