import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://naxajmglxwjlqmiehwld.supabase.co';
const SERVICE_KEY = 'sb_secret_sL-Kqpc_0bV7THVIiRNVsQ_Bgx_HQOj';
const DOMAIN = 'electrogrid.local';

const USERS = [
  { username: 'admin', password: 'admin123', fullName: 'Ing. Administrator Rețea MT', role: 'admin' },
  { username: 'electrician_sacele', password: 'sacele123', fullName: 'Electrician Formația Săcele–Prejmer', role: 'electrician' },
  { username: 'electrician_rasnov', password: 'rasnov123', fullName: 'Electrician Formația Râșnov–Predeal', role: 'electrician' },
  { username: 'electrician_codlea', password: 'codlea123', fullName: 'Electrician Formația Codlea–Feldioara', role: 'electrician' },
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function provisionAuthUsers() {
  console.log('⚡ Provizionare conturi în Supabase Auth...\n');

  const { data: existing, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Eroare la listare utilizatori:', listErr);
    return;
  }

  const existingEmails = new Set(existing.users.map((u) => u.email));

  for (const u of USERS) {
    const email = `${u.username}@${DOMAIN}`;
    if (existingEmails.has(email)) {
      console.log(`ℹ️ Utilizatorul ${u.username} (${email}) există deja.`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        username: u.username,
        full_name: u.fullName,
        role: u.role,
      },
    });

    if (error) {
      console.error(`❌ Eroare creare ${u.username}:`, error.message);
    } else {
      console.log(`✓ Creat utilizator Supabase Auth: ${u.username} (${email}) [ID: ${data.user.id}]`);
    }
  }

  const { data: updated } = await supabase.auth.admin.listUsers();
  console.log(`\n✅ Total utilizatori în Supabase Auth: ${updated.users.length}`);
}

provisionAuthUsers().catch(console.error);

