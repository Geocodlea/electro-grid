import { createClient as createServerSupabase } from './supabase/server';
import { cookies } from 'next/headers';
import { Profile, Zone } from './types';

export const USERNAME_DOMAIN = 'electrogrid.local';

export const AUTHORIZED_USERS = [
  {
    username: 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin' as const,
    assigned_zone_id: null,
    full_name: 'Ing. Administrator Rețea',
  },
  {
    username: 'electrician_sacele',
    password: process.env.ELEC_SACELE_PASSWORD || 'sacele123',
    role: 'electrician' as const,
    assigned_zone_id: '11111111-1111-1111-1111-111111111111', // Săcele + Prejmer
    full_name: 'Electrician Săcele–Prejmer',
  },
  {
    username: 'electrician_rasnov',
    password: process.env.ELEC_RASNOV_PASSWORD || 'rasnov123',
    role: 'electrician' as const,
    assigned_zone_id: '22222222-2222-2222-2222-222222222222', // Râșnov + Predeal
    full_name: 'Electrician Râșnov–Predeal',
  },
  {
    username: 'electrician_codlea',
    password: process.env.ELEC_CODLEA_PASSWORD || 'codlea123',
    role: 'electrician' as const,
    assigned_zone_id: '33333333-3333-3333-3333-333333333333', // Codlea + Feldioara
    full_name: 'Electrician Codlea–Feldioara',
  },
];

export function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
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

export async function getCurrentUser(): Promise<AuthSessionUser | null> {
  const cookieStore = await cookies();
  const fallbackSessionCookie = cookieStore.get('eg_local_session')?.value;

  // 1. Try Supabase Auth if credentials are configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createServerSupabase();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (user && !error) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, assigned_zone:zones(*)')
          .eq('id', user.id)
          .single();

        if (profile) {
          return {
            id: profile.id,
            username: profile.username,
            role: profile.role,
            assigned_zone_id: profile.assigned_zone_id,
            assigned_zone: profile.assigned_zone,
            full_name: profile.full_name || profile.username,
          };
        }
      }
    } catch (err) {
      console.warn('Supabase auth check failed, falling back to local session if present:', err);
    }
  }

  // 2. Check local session cookie (used for local standalone mode or when Supabase keys are not yet set)
  if (fallbackSessionCookie) {
    try {
      const parsed = JSON.parse(fallbackSessionCookie);
      if (parsed && parsed.id && parsed.username && parsed.role) {
        return parsed as AuthSessionUser;
      }
    } catch {
      // invalid cookie
    }
  }

  return null;
}
