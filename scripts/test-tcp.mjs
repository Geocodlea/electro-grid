import net from 'node:net';

const client = new net.Socket();
client.setTimeout(4000);

console.log('Testing TCP connection to db.naxajmglxwjlqmiehwld.supabase.co:5432...');

client.connect(5432, 'db.naxajmglxwjlqmiehwld.supabase.co', () => {
  console.log('✓ TCP connection to Supabase PostgreSQL port 5432 succeeded!');
  client.destroy();
});

client.on('error', (err) => {
  console.log('TCP connection error:', err.message);
});

client.on('timeout', () => {
  console.log('TCP connection timeout');
  client.destroy();
});

