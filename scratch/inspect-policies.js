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
  console.log("Listando políticas RLS de solicitudes...");
  const { data, error } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'solicitudes';"
  });

  if (error) {
    // Si no existe execute_sql_query, probamos con una consulta directa sobre pg_policies si es posible,
    // o simplemente tratamos de leer las políticas si hay otra forma.
    console.error("Error consultando pg_policies por RPC:", error.message);
    
    // Tratemos de ver si podemos hacer una consulta sobre la tabla de políticas usando sql indirecto,
    // pero si no hay RPC para SQL, podemos deducir que falló por RLS.
    // Vamos a buscar políticas en el código.
  } else {
    console.log("Políticas encontradas:", data);
  }
}

run().catch(console.error);
