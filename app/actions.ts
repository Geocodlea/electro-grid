'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { getCurrentUser, usernameToEmail } from '@/lib/auth';
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
  const username = (formData.get('username') as string)
    ?.trim()
    .toLowerCase();

  // Do not trim passwords: spaces can be intentional.
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Vă rugăm să introduceți utilizatorul și parola.' };
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error('Supabase authentication is not configured.');
    return { error: 'Serviciul de autentificare nu este configurat.' };
  }

  try {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });

    if (error || !data.user) {
      console.error('Supabase login failed:', error?.message);
      return { error: 'Nume de utilizator sau parolă incorectă.' };
    }

    // Verify that the authenticated user has an ElectroGrid profile.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      console.error('Authenticated user has no ElectroGrid profile:', {
        userId: data.user.id,
        error: profileError?.message,
      });

      return {
        error: 'Contul nu este configurat în ElectroGrid. Contactați administratorul.',
      };
    }

    // Remove any old custom authentication cookie.
    const cookieStore = await cookies();
    cookieStore.delete('eg_local_session');

    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error) {
    console.error('Login exception:', error);

    return {
      error: 'A apărut o eroare la autentificare. Încercați din nou.',
    };
  }
}

export async function logoutAction() {
  const supabase = await createServerSupabase();

  const { error } = await supabase.auth.signOut();

  // Remove any legacy local session cookie.
  const cookieStore = await cookies();
  cookieStore.delete('eg_local_session');

  if (error) {
    console.error('Supabase logout error:', error.message);
  }

  revalidatePath('/', 'layout');

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
