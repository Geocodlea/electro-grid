import { Equipment, EquipmentStatusColor, EquipmentStatusInfo } from './types';

/**
 * Computes equipment status color and metadata according to PDF Section 4:
 * 
 * ROȘU (Red) — Unavailable:
 * Echipamentul este marcat indisponibil de administrator. Starea are prioritate față de celelalte.
 * 
 * GALBEN (Yellow) — Observații:
 * Există observații ori sesizări în curs de verificare (ex. acces dificil sau lipsă manetă).
 * 
 * VERDE (Green) — Fără observații active:
 * Nu există observații active în registru. Nu certifică faptul că echipamentul este apt de manevră.
 */
export function computeEquipmentStatus(
  equipment: {
    is_unavailable: boolean;
    unavailable_reason?: string | null;
    official_observations?: string | null;
    pending_observations_count?: number;
  }
): EquipmentStatusInfo {
  // RED takes absolute priority
  if (equipment.is_unavailable) {
    return {
      color: 'red',
      label: 'Indisponibil',
      badgeClass: 'bg-red-100 text-red-800 border-red-300',
      borderClass: 'border-l-red-600 border-red-200',
      bgClass: 'bg-red-50/60',
      reason: equipment.unavailable_reason || 'Echipament marcat indisponibil de administrator.',
    };
  }

  // YELLOW: Has pending observations awaiting verification or active reported issues
  const hasPendingObservations = (equipment.pending_observations_count ?? 0) > 0;
  if (hasPendingObservations) {
    return {
      color: 'yellow',
      label: 'Observații / Sesizări în verificare',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      borderClass: 'border-l-amber-500 border-amber-200',
      bgClass: 'bg-amber-50/60',
      reason: 'Există sesizări în curs de verificare de către administrator.',
    };
  }

  // If there are official active observations noted on the equipment that advise caution
  if (equipment.official_observations && equipment.official_observations.trim().length > 0) {
    return {
      color: 'yellow',
      label: 'Observații active',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      borderClass: 'border-l-amber-500 border-amber-200',
      bgClass: 'bg-amber-50/60',
      reason: equipment.official_observations,
    };
  }

  // GREEN: No active observations in registry
  return {
    color: 'green',
    label: 'Fără observații active',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    borderClass: 'border-l-emerald-600 border-emerald-200',
    bgClass: 'bg-emerald-50/50',
    reason: 'Nu există observații active în registru.',
  };
}

export const SAFETY_DISCLAIMER_TEXT =
  'ElectroGrid MT este exclusiv un instrument de consultare și localizare. Nu comandă echipamente, nu stabilește manevre și nu înlocuiește schemele operative sau dispozițiile de manevră. Culoarea verde nu certifică faptul că echipamentul este apt de manevră.';

