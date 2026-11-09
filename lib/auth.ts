
import { createClient as createServerSupabase } from './supabase/server';
import { Zone } from './types';

export const USERNAME_DOMAIN = 'electrogrid.ro';

/**
 * Convert the username entered in the login form
 * into the internal email used by Supabase Auth.
 */
export function usernameToEmail(username: string): string {
  const clean = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');

  return `${clean}@${USERNAME_DOMAIN}`;
}

export interface AuthSessionUser {
  id: string;
  username: string;
  role: 'admin' | 'electrician';
  assigned_zone_id: string | null;
  assigned_zone?: Zone | null;
  full_name: string;
}

/**
 * Retrieve the currently authenticated Supabase user
 * and their corresponding ElectroGrid profile.
 */
export async function getCurrentUser(): Promise<AuthSessionUser | null> {
  try {
    const supabase = await createServerSupabase();

    // Get the actual authenticated Supabase user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Retrieve the corresponding ElectroGrid profile.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        role,
        assigned_zone_id,
        full_name,
        assigned_zone:zones(*)
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error retrieving user profile:', profileError.message);
      return null;
    }

    if (!profile) {
      console.error('No ElectroGrid profile found for:', user.id);
      return null;
    }

    return {
      id: profile.id,
      username: profile.username,
      role: profile.role as AuthSessionUser['role'],
      assigned_zone_id: profile.assigned_zone_id,
      assigned_zone: profile.assigned_zone as Zone | null,
      full_name: profile.full_name || profile.username,
    };
  } catch (error) {
    console.error('getCurrentUser failed:', error);
    return null;
  }
}
