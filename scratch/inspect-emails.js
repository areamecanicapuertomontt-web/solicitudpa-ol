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
  // 1. Check auth users list
  console.log("=== CHECKING AUTH USERS ===");
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error("Auth error:", authErr);
  } else {
    const victorUsers = users.filter(u => u.email && u.email.toLowerCase().includes('victor'));
    console.log("Auth users matching 'victor':", victorUsers.map(u => ({ id: u.id, email: u.email, user_metadata: u.user_metadata })));
  }

  // 2. Check failed emails rows
  console.log("\n=== CHECKING FAILED EMAILS ===");
  const { data: failedEmails, error: errFailed } = await supabase
    .from('correos_fallidos')
    .select('*')
    .limit(10);
  
  if (errFailed) {
    console.error("Failed emails query error:", errFailed);
  } else {
    console.log("Failed emails rows:", failedEmails);
  }
}

main().catch(console.error);
