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

async function run() {
  console.log("Intentando insertar dos solicitudes con el mismo token_aprobacion...");
  
  // Obtener una solicitud para usar de plantilla
  const { data: sol, error: solErr } = await supabase
    .from('solicitudes')
    .select('*')
    .limit(1)
    .single();

  if (solErr || !sol) {
    console.error("No se pudo obtener plantilla:", solErr);
    return;
  }

  // Insertar clon 1
  const t1 = "token-test-" + Date.now();
  console.log("Insertando con token:", t1);
  const { data: c1, error: e1 } = await supabase
    .from('solicitudes')
    .insert([{
      alumno: sol.alumno,
      rut: sol.rut,
      asignatura: sol.asignatura,
      seccion: sol.seccion,
      jornada: sol.jornada,
      fecha: sol.fecha,
      estado: 'DEVUELTA',
      docente_id: sol.docente_id,
      token_aprobacion: t1,
    }])
    .select();

  if (e1) {
    console.error("Error c1:", e1.message);
    return;
  }

  console.log("Insertando con el MISMO token para forzar error de UNIQUE...");
  const { data: c2, error: e2 } = await supabase
    .from('solicitudes')
    .insert([{
      alumno: sol.alumno,
      rut: sol.rut,
      asignatura: sol.asignatura,
      seccion: sol.seccion,
      jornada: sol.jornada,
      fecha: sol.fecha,
      estado: 'DEVUELTA',
      docente_id: sol.docente_id,
      token_aprobacion: t1, // Duplicado
    }]);

  if (e2) {
    console.log("✅ ¡CAPTURADO ERROR DE UNIQUE CON ÉXITO!");
    console.log("Código:", e2.code);
    console.log("Mensaje:", e2.message);
  } else {
    console.log("❌ No se generó error de UNIQUE. El token duplicado fue permitido.");
    // Limpiar c2 si se insertó
    if (c2 && c2[0]) await supabase.from('solicitudes').delete().eq('id', c2[0].id);
  }

  // Limpiar c1
  if (c1 && c1[0]) await supabase.from('solicitudes').delete().eq('id', c1[0].id);
}

run().catch(console.error);
