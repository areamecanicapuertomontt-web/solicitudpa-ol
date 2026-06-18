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
  const email = 'vmarin@inacap.cl';
  const password = 'DocenteInacap2026!';
  const nombre = 'Víctor Renier marin';
  const rol = 'DOCENTE';
  const asignatura = 'programacion';

  console.log(`Checking if user ${email} exists in Auth...`);
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existingUser = listData.users.find(u => u.email === email);
  if (existingUser) {
    console.log(`Deleting existing Auth user ID: ${existingUser.id}`);
    await supabase.auth.admin.deleteUser(existingUser.id);
  }

  // Also ensure no profile or docente row exists with this email to avoid duplicates
  await supabase.from('docentes').delete().eq('email', email);
  await supabase.from('perfiles').delete().eq('email', email);

  console.log(`Creating user ${email} in Auth...`);
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    user_metadata: { rol: rol, nombre: nombre },
    email_confirm: true
  });

  if (authError) {
    console.error("Error creating user in Auth:", authError.message);
    return;
  }

  const userId = authUser.user.id;
  console.log(`Auth user created successfully. ID: ${userId}`);

  // Insert profile in perfiles
  console.log(`Inserting profile...`);
  const { error: perfErr } = await supabase
    .from('perfiles')
    .insert({
      id: userId,
      email: email,
      nombre: nombre,
      rol: rol,
      rut: '17.888.888-8',
      jornada: null,
      seccion: null
    });
  
  if (perfErr) {
    console.error("Error inserting profile:", perfErr.message);
  } else {
    console.log("Profile inserted successfully.");
  }

  // Insert docente in docentes
  console.log(`Inserting docente in docentes...`);
  const { error: docErr } = await supabase
    .from('docentes')
    .insert({
      id: userId,
      nombre: nombre,
      email: email,
      asignatura: asignatura,
      activo: true
    });
  
  if (docErr) {
    console.error("Error inserting docente:", docErr.message);
  } else {
    console.log("Docente inserted successfully.");
  }
}

main().catch(console.error);
