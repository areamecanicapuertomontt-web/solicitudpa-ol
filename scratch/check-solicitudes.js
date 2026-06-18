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
  console.log("=== RECENT SOLICITUDES ===");
  const { data: solicitudes, error } = await supabase
    .from('solicitudes')
    .select('*, docentes(*)')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error("Error fetching solicitudes:", error);
  } else {
    console.log("Recent solicitudes:", solicitudes.map(s => ({
      id: s.id,
      alumno: s.alumno,
      email: s.alumno_email,
      asignatura: s.asignatura,
      docente: s.docentes ? s.docentes.nombre : 'None',
      docente_email: s.docentes ? s.docentes.email : 'None',
      estado: s.estado,
      created_at: s.created_at
    })));
  }
}

main().catch(console.error);
