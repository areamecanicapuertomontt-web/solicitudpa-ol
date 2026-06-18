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
  console.log("=== CHECKING COLUMNS FOR solicitudes ===");
  const { data: solData, error: solError } = await supabase
    .from('solicitudes')
    .select('*')
    .limit(1);

  if (solError) {
    console.error("Error:", solError);
  } else if (solData && solData.length > 0) {
    console.log("Columns in 'solicitudes':", Object.keys(solData[0]));
  } else {
    console.log("Table 'solicitudes' is empty or could not fetch columns.");
  }

  console.log("\n=== CHECKING COLUMNS FOR perfiles ===");
  const { data: perfData, error: perfError } = await supabase
    .from('perfiles')
    .select('*')
    .limit(1);

  if (perfError) {
    console.error("Error:", perfError);
  } else if (perfData && perfData.length > 0) {
    console.log("Columns in 'perfiles':", Object.keys(perfData[0]));
  } else {
    console.log("Table 'perfiles' is empty or could not fetch columns.");
  }
}

main().catch(console.error);
