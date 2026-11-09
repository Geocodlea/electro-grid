import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or service-role key in .env.local');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const accounts = [
    {
        username: 'electrician_sacele',
        email: 'electrician_sacele@electrogrid.ro',
        password: process.env.ELEC_SACELE_PASSWORD,
        full_name: 'Electrician Săcele–Prejmer',
        assigned_zone_id: '11111111-1111-1111-1111-111111111111',
    },
    {
        username: 'electrician_rasnov',
        email: 'electrician_rasnov@electrogrid.ro',
        password: process.env.ELEC_RASNOV_PASSWORD,
        full_name: 'Electrician Râșnov–Predeal',
        assigned_zone_id: '22222222-2222-2222-2222-222222222222',
    },
    {
        username: 'electrician_codlea',
        email: 'electrician_codlea@electrogrid.ro',
        password: process.env.ELEC_CODLEA_PASSWORD,
        full_name: 'Electrician Codlea–Feldioara',
        assigned_zone_id: '33333333-3333-3333-3333-333333333333',
    },
];

async function findAuthUserByEmail(email) {
    for (let page = 1; ; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({
            page,
            perPage: 100,
        });

        if (error) throw error;

        const found = data.users.find(
            (user) => user.email?.toLowerCase() === email.toLowerCase()
        );

        if (found) return found;
        if (data.users.length < 100) return null;
    }
}

async function provisionAccount(account) {
    if (!account.password) {
        throw new Error(`Missing password environment variable for ${account.username}`);
    }

    console.log(`\nProcessing ${account.username}...`);

    // Reuse an existing Auth account if one already exists.
    let authUser = await findAuthUserByEmail(account.email);

    if (!authUser) {
        const { data, error } = await supabase.auth.admin.createUser({
            email: account.email,
            password: account.password,
            email_confirm: true,
        });

        if (error) throw error;

        authUser = data.user;
        console.log('Created Supabase Auth account.');
    } else {
        console.log('Supabase Auth account already exists; preserving it.');
    }

    // Never overwrite an existing profile.
    const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, role, assigned_zone_id')
        .eq('id', authUser.id)
        .maybeSingle();

    if (profileError) throw profileError;

    if (existingProfile) {
        const matches =
            existingProfile.username === account.username &&
            existingProfile.role === 'electrician' &&
            existingProfile.assigned_zone_id === account.assigned_zone_id;

        if (!matches) {
            throw new Error(
                `Existing profile for ${account.username} does not match the expected configuration. No changes were made to it.`
            );
        }

        console.log('Matching profile already exists; preserving it.');
        return;
    }

    // Avoid a username collision with a different Auth user.
    const { data: usernameConflict, error: usernameError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', account.username)
        .maybeSingle();

    if (usernameError) throw usernameError;

    if (usernameConflict) {
        throw new Error(
            `Username ${account.username} is already associated with another profile.`
        );
    }

    const { error: insertError } = await supabase.from('profiles').insert({
        id: authUser.id,
        username: account.username,
        role: 'electrician',
        assigned_zone_id: account.assigned_zone_id,
        full_name: account.full_name,
    });

    if (insertError) throw insertError;

    console.log('Created matching profile.');
}

async function main() {
    // Validate all zone IDs before creating any accounts.
    const zoneIds = accounts.map((account) => account.assigned_zone_id);

    const { data: zones, error: zonesError } = await supabase
        .from('zones')
        .select('id')
        .in('id', zoneIds);

    if (zonesError) throw zonesError;

    const existingZoneIds = new Set(zones.map((zone) => zone.id));
    const missingZones = zoneIds.filter((id) => !existingZoneIds.has(id));

    if (missingZones.length) {
        throw new Error(`Missing zone IDs: ${missingZones.join(', ')}`);
    }

    for (const account of accounts) {
        await provisionAccount(account);
    }

    console.log('\nAll three electrician accounts are provisioned.');
}

main().catch((error) => {
    console.error('\nProvisioning failed:', error.message);
    process.exitCode = 1;
});
