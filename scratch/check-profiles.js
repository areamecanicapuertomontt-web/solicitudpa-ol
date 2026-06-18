const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse env file
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
  console.log("Checking profiles in DB...");
  const { data: profiles, error } = await supabase
    .from('perfiles')
    .select('email, nombre, carrera, jornada, seccion')
    .not('carrera', 'is', null)
    .limit(10);
  
  if (error) {
    console.error("Error fetching profiles:", error);
  } else {
    console.log("Profiles with carrera:", profiles);
  }
}

main().catch(console.error);
