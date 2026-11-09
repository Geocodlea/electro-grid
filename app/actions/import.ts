'use server';

import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
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

  // Use admin client for import (bypasses RLS for bulk operations)
  const supabase = createAdminClient();

  // Fetch all lines for name-matching if no targetLineId given
  let linesMap: Record<string, string> = {};
  if (!targetLineId) {
    const { data: allLines } = await supabase.from('lines').select('id, name');
    for (const l of allLines ?? []) {
      linesMap[l.name.toLowerCase()] = l.id;
    }
  }

  // Fetch all existing equipment codes to detect conflicts
  const { data: existingEquipment } = await supabase
    .from('equipment')
    .select('id, equipment_code');
  const existingCodesMap: Record<string, string> = {};
  for (const e of existingEquipment ?? []) {
    existingCodesMap[e.equipment_code.toLowerCase()] = e.id;
  }

  // Fallback line id (first available line) in case name resolution fails
  let fallbackLineId = targetLineId;
  if (!fallbackLineId) {
    const { data: firstLine } = await supabase
      .from('lines')
      .select('id')
      .limit(1)
      .single();
    fallbackLineId = firstLine?.id ?? null;
  }

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const feat of features) {
    try {
      if (!feat.isValid) {
        errorCount++;
        errors.push(`Ignorat [${feat.name}]: ${feat.validationErrors.join(', ')}`);
        continue;
      }

      if (!feat.latitude || !feat.longitude) {
        errorCount++;
        errors.push(`Echipament [${feat.name}] nu are coordonate GPS valide.`);
        continue;
      }

      // Resolve line id
      let lineId = targetLineId;
      if (!lineId && feat.lineName) {
        lineId = linesMap[feat.lineName.toLowerCase()];
      }
      if (!lineId) {
        lineId = fallbackLineId ?? undefined;
      }
      if (!lineId) {
        errorCount++;
        errors.push(`Echipament [${feat.name}]: linia nu a putut fi determinată.`);
        continue;
      }

      const code =
        feat.equipmentCode?.trim() ||
        `EQ-IMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      const existingId = existingCodesMap[code.toLowerCase()];

      if (existingId) {
        // Update existing record
        const { error: updErr } = await supabase
          .from('equipment')
          .update({
            name: feat.name.trim(),
            equipment_type: feat.equipmentType || 'PT',
            latitude: feat.latitude,
            longitude: feat.longitude,
            ...(feat.locality ? { locality: feat.locality } : {}),
            ...(feat.officialObservations
              ? { official_observations: feat.officialObservations }
              : {}),
            ...(feat.isUnavailable !== undefined
              ? {
                  is_unavailable: feat.isUnavailable,
                  unavailable_reason: feat.unavailableReason || null,
                }
              : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingId);

        if (updErr) {
          errorCount++;
          errors.push(`Eroare actualizare [${feat.name}]: ${updErr.message}`);
        } else {
          updatedCount++;
        }
      } else {
        // Create new equipment record
        const { error: insErr } = await supabase.from('equipment').insert({
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
        });

        if (insErr) {
          errorCount++;
          errors.push(`Eroare creare [${feat.name}]: ${insErr.message}`);
        } else {
          createdCount++;
          // Add to map to avoid duplicate inserts within same batch
          existingCodesMap[code.toLowerCase()] = 'created';
        }
      }
    } catch (err: any) {
      errorCount++;
      errors.push(
        `Eroare la procesarea echipamentului ${feat.name}: ${err?.message || 'Eroare necunoscută'}`
      );
    }
  }

  // Record in audit log
  await supabase.from('modification_history').insert({
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
      targetLineId: targetLineId ?? null,
    },
  });

  revalidatePath('/');
  revalidatePath('/admin');

  return {
    success: true,
    message: `Import finalizat: ${createdCount} adăugate, ${updatedCount} actualizate, ${errorCount} erori.`,
    createdCount,
    updatedCount,
    errorCount,
    errors,
  };
}
