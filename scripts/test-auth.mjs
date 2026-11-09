import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://naxajmglxwjlqmiehwld.supabase.co';
const SERVICE_KEY = 'sb_secret_sL-Kqpc_0bV7THVIiRNVsQ_Bgx_HQOj';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testAuth() {
  console.log('Testing Supabase Auth Admin API...');
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Auth error:', error);
  } else {
    console.log('Auth success! Found users:', data.users.length);
  }
}

testAuth();

