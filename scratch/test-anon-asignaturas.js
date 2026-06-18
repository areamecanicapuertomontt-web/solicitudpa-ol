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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing keys in .env.local", { supabaseUrl, anonKey });
  process.exit(1);
}

// Initialize client with ANON key
const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  console.log("Testing query on 'asignaturas' with ANON key...");
  const { data, error } = await supabase
    .from('asignaturas')
    .select('*')
    .order('nivel', { ascending: true })
    .order('nombre', { ascending: true });
  
  if (error) {
    console.error("Query failed with error:", error);
  } else {
    console.log(`Query succeeded. Fetched ${data.length} asignaturas.`);
    if (data.length > 0) {
      console.log("Sample:", data.slice(0, 3));
    }
  }
}

main().catch(console.error);
