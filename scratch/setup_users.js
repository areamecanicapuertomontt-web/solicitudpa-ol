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

async function setupUsers() {
  const users = [
    { id: 'fd0c3d44-e34d-44e8-908e-a75a550ae157', email: 'diego.henriquez34@inacapmail.cl', rol: 'ALUMNO', nombre: 'Diego Henríquez (Alumno)', metadata: { rol: 'ALUMNO', nombre: 'Diego Henríquez (Alumno)' } },
    { id: 'c22187ed-06cb-4f35-b1ba-3fc095fc85c0', email: 'diegohenriquez176@gmail.com', rol: 'DOCENTE', nombre: 'Diego Henríquez (Prueba)', metadata: { rol: 'DOCENTE', nombre: 'Diego Henríquez (Prueba)', asignatura: 'Taller Mecánico — Prueba' } },
    { id: '1c37c2c4-e9bb-4c58-bd4d-669ea41f6f25', email: 'diegohen2005gonzales@gmail.com', rol: 'PANOL', nombre: 'Diego Gonzales (Pañol)', metadata: { rol: 'PANOL', nombre: 'Diego Gonzales (Pañol)' } },
    { id: '465975ee-fe79-4c26-aefa-1e0d6b17bda1', email: 'calvaradob@inacap.cl', rol: 'ADMIN', nombre: 'Cesar Alvarado Barria', metadata: { rol: 'ADMIN', nombre: 'Cesar Alvarado Barria' } }
  ];

  for (const u of users) {
    try {
      // Intentar actualizar la contraseña
      const { data, error } = await supabase.auth.admin.updateUserById(u.id, {
        password: 'diego2412',
        user_metadata: u.metadata,
        email_confirm: true
      });
      if (error) {
        // Si no existe, crearlo con ese ID
        console.log(`User ${u.email} not found (Error: ${error.message}), creating...`);
        const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
          id: u.id,
          email: u.email,
          password: 'diego2412',
          user_metadata: u.metadata,
          email_confirm: true
        });
        if (createErr) {
          console.error(`Error creating ${u.email}:`, createErr.message);
        } else {
          console.log(`Created ${u.email} successfully.`);
        }
      } else {
        console.log(`Updated ${u.email} successfully.`);
      }
    } catch (err) {
      console.error(`Exception for ${u.email}:`, err.message);
    }
  }
}
setupUsers();
