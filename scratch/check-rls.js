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
  console.log("Checking pg_policies for asignaturas...");
  const { data, error } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'asignaturas';"
  });

  if (error) {
    console.error("Error calling execute_sql_query RPC:", error.message);
  } else {
    console.log("RLS Policies on 'asignaturas':", data);
  }

  // Also query if RLS is enabled on asignaturas
  const { data: rlsStatus, error: rlsError } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'asignaturas';"
  });
  if (rlsError) {
    console.error("Error checking relrowsecurity:", rlsError.message);
  } else {
    console.log("RLS Status on 'asignaturas':", rlsStatus);
  }
}

main().catch(console.error);
