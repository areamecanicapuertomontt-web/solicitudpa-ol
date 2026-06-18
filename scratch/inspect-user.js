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
  // 1. Inspect user
  const email = 'diego.henriquez34@inacapmail.cl';
  console.log(`Checking profile for email ${email}...`);
  const { data: userData, error: userError } = await supabase
    .from('perfiles')
    .select('*')
    .eq('email', email);
  
  if (userError) {
    console.error("Error fetching user profile:", userError.message);
  } else {
    console.log("User profile:", userData);
  }

  // 2. Inspect asignaturas
  console.log("\nChecking asignaturas table...");
  const { count, data: countData, error: countError } = await supabase
    .from('asignaturas')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error("Error getting count of asignaturas:", countError.message);
  } else {
    console.log(`Total asignaturas in DB: ${count}`);
  }

  const { data: sampleData, error: sampleError } = await supabase
    .from('asignaturas')
    .select('*')
    .limit(10);
  
  if (sampleError) {
    console.error("Error getting sample asignaturas:", sampleError.message);
  } else {
    console.log("Sample asignaturas (first 10):", sampleData);
  }
}

main().catch(console.error);
