import fetch from 'node:fs';

const SUPABASE_URL = 'https://naxajmglxwjlqmiehwld.supabase.co';
const SERVICE_KEY = 'sb_secret_sL-Kqpc_0bV7THVIiRNVsQ_Bgx_HQOj';

async function testSqlEndpoints() {
  const endpoints = [
    '/pg/query',
    '/sql',
    '/rest/v1/rpc',
    '/api/v1/query',
    '/v1/query',
  ];

  for (const ep of endpoints) {
    try {
      const res = await globalThis.fetch(`${SUPABASE_URL}${ep}`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: 'SELECT 1;' }),
      });
      console.log(`Endpoint ${ep} returned:`, res.status, await res.text());
    } catch (e) {
      console.log(`Endpoint ${ep} error:`, e.message);
    }
  }
}

testSqlEndpoints();

