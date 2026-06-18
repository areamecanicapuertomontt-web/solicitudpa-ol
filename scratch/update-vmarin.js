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
  const email = 'vmarin@inacap.cl';
  
  console.log("Updating docente asignatura to 'programacion'...");
  const { error } = await supabase
    .from('docentes')
    .update({ asignatura: 'programacion' })
    .eq('email', email);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Asignatura updated successfully.");
  }
}

main().catch(console.error);
