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
  // 1. Check if the docente is in the public.docentes table
  console.log("=== CHECKING DOCENTES IN DB ===");
  const { data: docentes, error: errDoc } = await supabase
    .from('docentes')
    .select('*')
    .ilike('email', '%victor.marin%');
  
  if (errDoc) {
    console.error("Error fetching doc:", errDoc);
  } else {
    console.log("Docentes found:", docentes);
  }

  // 2. Check if the admin is in public.perfiles
  console.log("\n=== CHECKING PERFILES IN DB ===");
  const { data: perfiles, error: errPerf } = await supabase
    .from('perfiles')
    .select('*')
    .ilike('email', '%victor%');
  
  if (errPerf) {
    console.error("Error fetching perf:", errPerf);
  } else {
    console.log("Perfiles found:", perfiles);
  }

  // 3. Check failed emails log
  console.log("\n=== CHECKING FAILED EMAILS ===");
  const { data: failedEmails, error: errFailed } = await supabase
    .from('correos_fallidos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (errFailed) {
    console.error("Error fetching failed emails:", errFailed);
  } else {
    console.log("Recent failed emails:", failedEmails);
  }
}

main().catch(console.error);
