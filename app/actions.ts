'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { getCurrentUser, usernameToEmail, AuthSessionUser, AUTHORIZED_USERS } from '@/lib/auth';
import {
  submitObservation as dbSubmitObservation,
  reviewObservation as dbReviewObservation,
  updateEquipmentAvailability as dbUpdateAvailability,
  createEquipment as dbCreateEquipment,
  updateEquipment as dbUpdateEquipment,
  deleteEquipment as dbDeleteEquipment,
} from '@/lib/db';
import { Observation, ParsedFeature } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function loginAction(formData: FormData) {
  const username = (formData.get('username') as string)?.trim().toLowerCase();
  const password = (formData.get('password') as string)?.trim();

  if (!username || !password) {
    return { error: 'Vă rugăm să introduceți utilizatorul și parola.' };
  }

  // 1. If Supabase is configured, attempt authentication with mapped email
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createServerSupabase();
      const internalEmail = usernameToEmail(username);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: password,
      });

      if (!error && data.user) {
        revalidatePath('/', 'layout');
        return { success: true };
      }
    } catch (err) {
      console.warn('Supabase login error, checking local authorized accounts:', err);
    }
  }

  // 2. Check authoritative local 4 accounts
  const matched = AUTHORIZED_USERS.find(
    (u) => u.username === username && u.password === password
  );

  if (!matched) {
    return { error: 'Nume de utilizator sau parolă incorectă.' };
  }

  const sessionUser: AuthSessionUser = {
    id: `usr-${matched.username}`,
    username: matched.username,
    role: matched.role,
    assigned_zone_id: matched.assigned_zone_id,
    full_name: matched.full_name,
  };

  const cookieStore = await cookies();
  cookieStore.set('eg_local_session', JSON.stringify(sessionUser), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('eg_local_session');

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createServerSupabase();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase logout error:', e);
    }
  }

  redirect('/login');
}

export async function submitObservationAction(
  equipmentId: string,
  text: string,
  category: Observation['category']
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Sesiunea a expirat. Vă rugăm să vă autentificați din nou.');
  }

  const result = await dbSubmitObservation(equipmentId, text, category, user);
  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true, observation: result };
}

export async function reviewObservationAction(
  observationId: string,
  action: 'approve' | 'reject' | 'needs_verification',
  adminNotes: string | null,
  updateOfficialNotes: boolean
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Acces neautorizat. Doar administratorul poate valida sesizări.');
  }

  const result = await dbReviewObservation(
    observationId,
    action,
    adminNotes,
    updateOfficialNotes,
    user
  );
  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true, observation: result };
}

export async function updateAvailabilityAction(
  equipmentId: string,
  isUnavailable: boolean,
  reason: string | null
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Acces neautorizat. Doar administratorul poate declara indisponibilitatea.');
  }

  const result = await dbUpdateAvailability(equipmentId, isUnavailable, reason, user);
  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true, equipment: result };
}

export async function createEquipmentAction(data: {
  equipment_code: string;
  name: string;
  equipment_type: string;
  line_id: string;
  locality?: string;
  latitude: number;
  longitude: number;
  official_observations?: string;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Acces neautorizat.');
  }

  const result = await dbCreateEquipment(data, user);
  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true, equipment: result };
}

export async function updateEquipmentAction(
  id: string,
  data: {
    name: string;
    equipment_type: string;
    line_id: string;
    locality?: string;
    latitude: number;
    longitude: number;
    official_observations?: string;
  }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Acces neautorizat.');
  }

  const result = await dbUpdateEquipment(id, data, user);
  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true, equipment: result };
}

export async function deleteEquipmentAction(id: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Acces neautorizat.');
  }

  await dbDeleteEquipment(id, user);
  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true };
}
