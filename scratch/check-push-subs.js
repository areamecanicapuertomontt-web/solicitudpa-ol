const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("=== PERFILES (DOCENTE, PANOL, ADMIN) ===");
  const { data: perfiles, error: perfErr } = await supabase
    .from('perfiles')
    .select('id, email, nombre, rol')
    .neq('rol', 'ALUMNO');
  
  if (perfErr) {
    console.error("Error fetching perfiles:", perfErr);
  } else {
    console.log(perfiles);
  }

  console.log("\n=== PUSH SUBSCRIPTIONS ===");
  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('*');
  
  if (subErr) {
    console.error("Error fetching push_subscriptions:", subErr);
  } else {
    console.log(subs);
  }
}

main().catch(console.error);
