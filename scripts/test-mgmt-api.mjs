const PROJECT_REF = 'naxajmglxwjlqmiehwld';
const SECRET_KEY = 'sb_secret_sL-Kqpc_0bV7THVIiRNVsQ_Bgx_HQOj';

async function testManagement() {
  console.log('Testing api.supabase.com management query endpoint...');
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'SELECT 1 as test;' }),
    });
    console.log('Status:', res.status);
    console.log('Response:', await res.text());
  } catch (e) {
    console.log('Error:', e.message);
  }
}

testManagement();

