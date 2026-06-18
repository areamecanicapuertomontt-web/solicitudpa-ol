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

async function createAdmin() {
  const email = 'victor.renier.marin@gmail.com';
  const password = 'InacapAdmin2026!';
  const nombre = 'Víctor Marin (Admin)';
  const rol = 'ADMIN';

  console.log(`Creating/updating user ${email} in Auth...`);
  
  try {
    // 1. Crear en auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: { rol: rol, nombre: nombre },
      email_confirm: true
    });

    let userId = authUser?.user?.id;

    if (authError) {
      if (authError.message.includes('already exists') || authError.message.includes('email_exists')) {
        console.log('User already exists in Auth. Updating password and metadata...');
        // Buscar el usuario existente para obtener su ID
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existingUser = listData.users.find(u => u.email === email);
        if (existingUser) {
          userId = existingUser.id;
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
        return;
      }
    } else {
      console.log('Auth user created successfully. ID:', userId);
    }

    if (!userId) {
      console.error("No se pudo obtener el ID del usuario.");
      return;
    }

    // 2. Insertar/Actualizar en public.perfiles
    console.log(`Inserting/updating profile for ${email} in public.perfiles...`);
    const { error: profileError } = await supabase
      .from('perfiles')
      .upsert({
        id: userId,
        email: email,
        nombre: nombre,
        rol: rol,
        rut: '17.999.999-9',
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
