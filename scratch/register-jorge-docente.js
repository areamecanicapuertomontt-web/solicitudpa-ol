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
  const email = 'jorge.navarrp@inacapmail.cl';
  const password = 'DocenteInacap2026!';
  const nombre = 'Jorge Navarro (Prueba Docente)';
  const rol = 'DOCENTE';
  const asignatura = 'programacion';

  console.log(`Checking if user ${email} exists in Auth...`);
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existingUser = listData.users.find(u => u.email === email);
  if (existingUser) {
    console.log(`Deleting existing Auth user ID: ${existingUser.id}`);
    await supabase.auth.admin.deleteUser(existingUser.id);
  }

  // Ensure no profile or docente row exists with this email to avoid duplicates
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

  // Update profile and docente table since trigger runs automatically
  console.log("Updating profiles and docentes to ensure details are set...");
  
  // Wait a short delay to let trigger finish
  await new Promise(r => setTimeout(r, 1000));

  const { error: perfErr } = await supabase
    .from('perfiles')
    .upsert({
      id: userId,
      email: email,
      nombre: nombre,
      rol: rol,
      rut: '17.777.777-7',
      jornada: null,
      seccion: null
    }, { onConflict: 'email' });

  if (perfErr) console.error("Error upserting profile:", perfErr.message);
  else console.log("Profile upserted successfully.");

  const { error: docErr } = await supabase
    .from('docentes')
    .upsert({
      id: userId,
      nombre: nombre,
      email: email,
      asignatura: asignatura,
      activo: true
    }, { onConflict: 'email' });

  if (docErr) console.error("Error upserting docente:", docErr.message);
  else console.log("Docente upserted successfully.");
}

main().catch(console.error);
