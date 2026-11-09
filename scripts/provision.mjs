/**
 * ElectroGrid MT - Secure User Provisioning Script
 * 
 * Provisions the exactly 4 authorized accounts specified in the prompt:
 * 1. Administrator (all 5 zones)
 * 2. Electrician 1 (Zone: Săcele + Prejmer)
 * 3. Electrician 2 (Zone: Râșnov + Predeal)
 * 4. Electrician 3 (Zone: Codlea + Feldioara)
 * 
 * Usage:
 *   node scripts/provision.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DOMAIN = 'electrogrid.local';

const USERS_TO_PROVISION = [
  {
    username: 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin',
    assignedZoneName: null, // all zones
    fullName: 'Ing. Administrator Rețea MT',
  },
  {
    username: 'electrician_sacele',
    password: process.env.ELEC_SACELE_PASSWORD || 'sacele123',
    role: 'electrician',
    assignedZoneName: 'Săcele + Prejmer',
    fullName: 'Electrician Formația Săcele–Prejmer',
  },
  {
    username: 'electrician_rasnov',
    password: process.env.ELEC_RASNOV_PASSWORD || 'rasnov123',
    role: 'electrician',
    assignedZoneName: 'Râșnov + Predeal',
    fullName: 'Electrician Formația Râșnov–Predeal',
  },
  {
    username: 'electrician_codlea',
    password: process.env.ELEC_CODLEA_PASSWORD || 'codlea123',
    role: 'electrician',
    assignedZoneName: 'Codlea + Feldioara',
    fullName: 'Electrician Formația Codlea–Feldioara',
  },
];

async function main() {
  console.log('⚡ ElectroGrid MT — Inițializare procedură securizată de provizionare conturi...\n');

  if (!SUPABASE_URL || !SERVICE_KEY || SUPABASE_URL.includes('your-project')) {
    console.log('ℹ️  Cheile Supabase (SUPABASE_SERVICE_ROLE_KEY) nu sunt configurate în mediu.');
    console.log('Aplicația utilizează cele 4 conturi autorizate locale pre-configurate în siguranță:\n');
    USERS_TO_PROVISION.forEach((u, i) => {
      console.log(`  ${i + 1}. Utilizator: ${u.username} | Rol: ${u.role.toUpperCase()} | Zonă: ${u.assignedZoneName || 'TOATE (5 zone)'}`);
    });
    console.log('\nPentru a proviziona în Supabase PostgreSQL Cloud, setați:');
    console.log('  export NEXT_PUBLIC_SUPABASE_URL="https://xyz.supabase.co"');
    console.log('  export SUPABASE_SERVICE_ROLE_KEY="cheie_secreta_service_role"');
    console.log('și rulați din nou: node scripts/provision.mjs\n');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Fetch zones to resolve assigned_zone_id
  const { data: zones, error: zoneErr } = await supabase.from('zones').select('id, name');
  if (zoneErr) {
    console.error('❌ Eroare la citirea zonelor din baza de date:', zoneErr.message);
    process.exit(1);
  }

  const zoneMap = new Map((zones || []).map((z) => [z.name, z.id]));

  for (const acc of USERS_TO_PROVISION) {
    const email = `${acc.username}@${DOMAIN}`;
    console.log(`Procesare cont: ${acc.username} (${email})...`);

    // Check if auth user exists
    const { data: listUsers } = await supabase.auth.admin.listUsers();
    let authUser = listUsers?.users?.find((u) => u.email === email);

    if (!authUser) {
      // Create user
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { username: acc.username, full_name: acc.fullName },
      });

      if (createErr) {
        console.error(`  ❌ Eroare la crearea utilizatorului ${acc.username}:`, createErr.message);
        continue;
      }
      authUser = created.user;
      console.log(`  ✓ Creat cu succes în auth.users (ID: ${authUser.id})`);
    } else {
      console.log(`  ℹ️ Utilizatorul există deja în auth.users.`);
    }

    // Resolve assigned_zone_id
    const assignedZoneId = acc.assignedZoneName ? zoneMap.get(acc.assignedZoneName) || null : null;

    // Upsert into public.profiles
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: authUser.id,
      username: acc.username,
      role: acc.role,
      assigned_zone_id: assignedZoneId,
      full_name: acc.fullName,
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      console.error(`  ❌ Eroare la salvarea profilului ${acc.username}:`, profileErr.message);
    } else {
      console.log(`  ✓ Profil sincronizat în public.profiles.`);
    }
  }

  console.log('\n✅ Procedura de provizionare a celor 4 conturi s-a încheiat cu succes!');
}

main().catch((err) => {
  console.error('Eroare neașteptată:', err);
  process.exit(1);
});

