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
  console.log("Obteniendo una solicitud existente...");
  const { data: sol, error: solErr } = await supabase
    .from('solicitudes')
    .select('*')
    .limit(1)
    .single();

  if (solErr || !sol) {
    console.error("No se pudo obtener una solicitud original:", solErr?.message);
    return;
  }

  console.log("Intentando insertar clon de la solicitud ID:", sol.id);
  const { data: newSol, error: newSolErr } = await supabase
    .from('solicitudes')
    .insert([{
      alumno: sol.alumno,
      rut: sol.rut,
      alumno_email: sol.alumno_email,
      asignatura: sol.asignatura,
      seccion: sol.seccion,
      jornada: sol.jornada,
      fecha: sol.fecha,
      estado: 'DEVUELTA',
      docente_id: sol.docente_id,
      token_aprobacion: sol.token_aprobacion + "-clon",
      codigo_entrega: sol.codigo_entrega,
      observaciones: `Devolución parcial. Original: ${sol.id}`
    }])
    .select();

  if (newSolErr) {
    console.error("❌ ERROR AL CLONAR SOLICITUD:");
    console.error("Código:", newSolErr.code);
    console.error("Mensaje:", newSolErr.message);
    console.error("Detalle:", newSolErr.details);
    console.error("Hint:", newSolErr.hint);
  } else {
    console.log("✅ ¡Clon insertado con éxito!", newSol);
    // Limpiar clon
    await supabase.from('solicitudes').delete().eq('id', newSol[0].id);
  }
}

run().catch(console.error);
