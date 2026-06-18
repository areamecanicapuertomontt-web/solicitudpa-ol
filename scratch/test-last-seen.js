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

async function test() {
  console.log("Consultando la tabla perfiles...");
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, rol, last_seen')
    .limit(1);

  if (error) {
    console.error("Error al consultar:", error.message);
  } else {
    console.log("¡Consulta exitosa! Columnas disponibles:", Object.keys(data[0] || {}));
    if (data[0] && 'last_seen' in data[0]) {
      console.log("La columna 'last_seen' existe.");
    } else {
      console.log("La columna 'last_seen' NO existe en la respuesta.");
    }
  }
}

test().catch(console.error);
