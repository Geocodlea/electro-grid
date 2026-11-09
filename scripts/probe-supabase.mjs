import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://naxajmglxwjlqmiehwld.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_sL-Kqpc_0bV7THVIiRNVsQ_Bgx_HQOj';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function check() {
  console.log('Testing connection to Supabase:', SUPABASE_URL);

  const tables = ['zones', 'stations', 'lines', 'equipment', 'observations', 'profiles', 'modification_history'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('count').limit(1);
    if (error) {
      console.log(`Table '${t}': NOT FOUND or ERROR:`, error.message, error.code);
    } else {
      console.log(`Table '${t}': EXISTS!`);
    }
  }
}

check().catch(console.error);

