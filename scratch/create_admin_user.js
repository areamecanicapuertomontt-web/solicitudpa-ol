const fs = require('fs');
const dotenvContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
dotenvContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function createAdmin() {
  const email = 'fabinacappuertomontt@gmail.com';
  const password = 'diego2412';
  const nombre = 'Fabian Inacap (Admin)';
  const rol = 'ADMIN';
  const id = '6b8527fe-ae12-40f0-89fa-5cade4f7f12e';

  console.log(`Creating/updating user ${email} in Auth...`);
  
  try {
    // 1. Crear en auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      id: id,
      email: email,
      password: password,
      user_metadata: { rol: rol, nombre: nombre },
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log('User already exists in Auth. Updating password and metadata...');
        // Si ya existe, buscar su ID
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existingUser = listData.users.find(u => u.email === email);
        if (existingUser) {
          const { error: updateErr } = await supabase.auth.admin.updateUserById(existingUser.id, {
            password: password,
            user_metadata: { rol: rol, nombre: nombre },
            email_confirm: true
          });
          if (updateErr) console.error('Error updating existing auth user:', updateErr.message);
          else console.log('Auth user updated successfully.');
        }
      } else {
        console.error('Error creating auth user:', authError.message);
      }
    } else {
      console.log('Auth user created successfully.');
    }

    // 2. Insertar/Actualizar en public.perfiles
    console.log(`Inserting/updating profile for ${email} in public.perfiles...`);
    const { error: profileError } = await supabase
      .from('perfiles')
      .upsert({
        id: id,
        email: email,
        nombre: nombre,
        rol: rol,
        rut: '12345678-9',
        jornada: null,
        seccion: null
      }, { onConflict: 'email' });

    if (profileError) {
      console.error('Error upserting profile in public.perfiles:', profileError.message);
    } else {
      console.log('Profile created/updated successfully in public.perfiles.');
    }
  } catch (err) {
    console.error('Exception:', err.message);
  }
}

createAdmin();
