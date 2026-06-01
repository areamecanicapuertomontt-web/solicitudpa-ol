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

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing keys in .env.local", { supabaseUrl, serviceRoleKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("Checking tables and views in public schema...");
  
  const tablesToCheck = ['alumnos', 'perfiles', 'docentes', 'panoles', 'materiales', 'solicitudes'];
  for (const table of tablesToCheck) {
    const { data: selectData, error: selectError } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.log(`Table/View "${table}": NOT FOUND or ERROR (${selectError.message})`);
    } else {
      console.log(`Table/View "${table}": EXISTS (Found: ${JSON.stringify(selectData)})`);
    }
  }
}

main().catch(console.error);
