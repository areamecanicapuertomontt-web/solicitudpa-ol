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

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const email = 'victor.marin02@inacapmail.cl';
  const password = 'DocenteInacap2026!';
  const nombre = 'Víctor Renier marin';
  const rol = 'DOCENTE';
  const id = '1e3c7477-3c6b-4fae-b479-83458ef70b4c'; // El ID que ya existe en la tabla docentes

  console.log(`Cleaning up mismatched auth user for ${email}...`);
  
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existingUser = listData.users.find(u => u.email === email);
  if (existingUser) {
    console.log(`Deleting Auth user ID: ${existingUser.id}`);
    const { error: delAuthErr } = await supabase.auth.admin.deleteUser(existingUser.id);
    if (delAuthErr) console.error("Error deleting from auth:", delAuthErr.message);
  }

  // Crear usuario con el ID correcto en Auth
  console.log(`Creating user ${email} in Auth with fixed ID ${id}...`);
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    id: id,
    email: email,
    password: password,
    user_metadata: { rol: rol, nombre: nombre },
    email_confirm: true
  });

  if (authError) {
    console.error("Error creating user in Auth:", authError.message);
    return;
  }

  console.log(`Auth user created successfully.`);

  // Insertar/actualizar perfil en perfiles
  console.log(`Upserting profile in perfiles...`);
  const { error: perfErr } = await supabase
    .from('perfiles')
    .upsert({
      id: id,
      email: email,
      nombre: nombre,
      rol: rol,
      rut: '17.888.888-8',
      jornada: null,
      seccion: null
    }, { onConflict: 'email' });
  
  if (perfErr) {
    console.error("Error upserting profile:", perfErr.message);
  } else {
    console.log("Profile upserted successfully.");
  }
}

main().catch(console.error);
