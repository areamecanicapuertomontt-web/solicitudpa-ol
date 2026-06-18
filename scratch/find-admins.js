const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse env file
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing keys in .env.local", { supabaseUrl, serviceRoleKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("Analyzing profile roles...");
  const { data, error } = await supabase
    .from('perfiles')
    .select('rol');
  
  if (error) {
    console.error("Error fetching profiles:", error.message);
  } else {
    const counts = {};
    data.forEach(p => {
      counts[p.rol] = (counts[p.rol] || 0) + 1;
    });
    console.log("Role distribution:", counts);
  }
}

main().catch(console.error);
