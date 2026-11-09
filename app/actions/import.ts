'use server';

import { getCurrentUser } from '@/lib/auth';
import { ParsedFeature } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export interface ImportResult {
  success: boolean;
  message?: string;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  errors: string[];
}

export async function commitImportAction(
  features: ParsedFeature[],
  targetStationId?: string,
  targetLineId?: string
): Promise<ImportResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return {
      success: false,
      message: 'Acces neautorizat. Doar administratorul poate efectua importuri de date.',
      createdCount: 0,
      updatedCount: 0,
      errorCount: 0,
      errors: ['Acces neautorizat.'],
    };
  }

  if (!features || features.length === 0) {
    return {
      success: false,
      message: 'Nu au fost furnizate înregistrări pentru import.',
      createdCount: 0,
      updatedCount: 0,
      errorCount: 0,
      errors: ['Nicio înregistrare disponibilă.'],
    };
  }

  const store = (global as any).__EG_DB;
  if (!store) {
    return {
      success: false,
      message: 'Baza de date internă nu este inițializată.',
      createdCount: 0,
      updatedCount: 0,
      errorCount: 0,
      errors: ['Eroare internă de stocare.'],
    };
  }

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const feat of features) {
    try {
      if (!feat.isValid) {
        errorCount++;
        errors.push(`Ignorat rândul [${feat.name}]: ${feat.validationErrors.join(', ')}`);
        continue;
      }

      if (!feat.latitude || !feat.longitude) {
        errorCount++;
        errors.push(`Echipament [${feat.name}] nu are coordonate GPS valide.`);
        continue;
      }

      // Determine Line ID
      let lineId = targetLineId;
      if (!lineId && feat.lineName) {
        const foundLine = store.lines.find(
          (l: any) => l.name.toLowerCase() === feat.lineName?.toLowerCase()
        );
        if (foundLine) {
          lineId = foundLine.id;
        }
      }

      if (!lineId) {
        // If line not resolved, use first available line as fallback or target line
        lineId = store.lines[0]?.id;
      }

      const code = feat.equipmentCode?.trim() || `EQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Check if equipment already exists with this code
      const existingIdx = store.equipment.findIndex(
        (e: any) => e.equipment_code.toLowerCase() === code.toLowerCase()
      );

      if (existingIdx >= 0) {
        // Update existing record
        const existing = store.equipment[existingIdx];
        existing.name = feat.name.trim();
        existing.equipment_type = feat.equipmentType || existing.equipment_type;
        existing.latitude = feat.latitude;
        existing.longitude = feat.longitude;
        if (feat.locality) existing.locality = feat.locality;
        if (feat.officialObservations) existing.official_observations = feat.officialObservations;
        if (feat.isUnavailable !== undefined) {
          existing.is_unavailable = feat.isUnavailable;
          existing.unavailable_reason = feat.unavailableReason || null;
        }
        existing.updated_at = new Date().toISOString();
        updatedCount++;
      } else {
        // Create new equipment record
        store.equipment.push({
          id: 'eq-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          equipment_code: code,
          name: feat.name.trim(),
          equipment_type: feat.equipmentType || 'PT',
          line_id: lineId,
          locality: feat.locality || null,
          latitude: feat.latitude,
          longitude: feat.longitude,
          official_observations: feat.officialObservations || null,
          is_unavailable: Boolean(feat.isUnavailable),
          unavailable_reason: feat.unavailableReason || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        createdCount++;
      }
    } catch (err: any) {
      errorCount++;
      errors.push(`Eroare la procesarea echipamentului ${feat.name}: ${err?.message || 'Eroare necunoscută'}`);
    }
  }

  // Record in audit log / modification history
  store.auditLogs.unshift({
    id: 'audit-' + Date.now(),
    user_id: user.id,
    action_type: 'network_import',
    entity_type: 'import',
    entity_id: null,
    details: {
      total: features.length,
      created: createdCount,
      updated: updatedCount,
      errors: errorCount,
      importedBy: user.username,
      targetLineId,
    },
    created_at: new Date().toISOString(),
  });

  revalidatePath('/');
  revalidatePath('/admin');

  return {
    success: true,
    message: `Import finalizat cu succes: ${createdCount} adăugate, ${updatedCount} actualizate, ${errorCount} erori.`,
    createdCount,
    updatedCount,
    errorCount,
    errors,
  };
}
