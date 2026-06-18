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

async function main() {
  const oldEmail = 'victor.marin02@inacapmail.cl';
  const newEmail = 'victor.renier.marin@gmail.com';
  const oldDocenteId = '1e3c7477-3c6b-4fae-b479-83458ef70b4c';
  const newDocenteId = '0e2cda7d-abf4-40b7-b788-c02bf0ac066e'; // ID de victor.renier.marin@gmail.com

  console.log(`=== REASSIGNING DOCENTE FROM ${oldEmail} TO ${newEmail} ===`);

  // 1. Cambiar el rol de victor.renier.marin@gmail.com a DOCENTE en Auth
  console.log(`Updating Auth metadata for ${newEmail} to DOCENTE...`);
  const { error: authErr } = await supabase.auth.admin.updateUserById(newDocenteId, {
    user_metadata: { rol: 'DOCENTE', nombre: 'Víctor Renier marin' }
  });
  if (authErr) console.error("Error updating Auth:", authErr.message);
  else console.log("Auth metadata updated.");

  // 2. Actualizar el rol en public.perfiles para victor.renier.marin@gmail.com
  console.log(`Updating profile role for ${newEmail}...`);
  const { error: perfErr } = await supabase
    .from('perfiles')
    .update({ rol: 'DOCENTE' })
    .eq('email', newEmail);
  if (perfErr) console.error("Error updating profile:", perfErr.message);
  else console.log("Profile updated successfully.");

  // 3. Crear el docente para victor.renier.marin@gmail.com
  console.log(`Creating record in public.docentes for ${newEmail}...`);
  const { error: docErr } = await supabase
    .from('docentes')
    .upsert({
      id: newDocenteId,
      nombre: 'Víctor Renier marin',
      email: newEmail,
      asignatura: 'programacion',
      activo: true
    }, { onConflict: 'email' });
  if (docErr) console.error("Error creating docente record:", docErr.message);
  else console.log("Docente record created successfully.");

  // 4. Reasignar solicitudes del antiguo ID al nuevo ID
  console.log(`Reassigning solicitudes from ID ${oldDocenteId} to ${newDocenteId}...`);
  const { data: updatedSols, error: solErr } = await supabase
    .from('solicitudes')
    .update({ docente_id: newDocenteId })
    .eq('docente_id', oldDocenteId)
    .select();
  
  if (solErr) console.error("Error updating solicitudes:", solErr.message);
  else console.log(`Reassigned ${updatedSols.length} solicitudes successfully.`);

  // 5. Eliminar al docente antiguo de public.docentes
  console.log(`Deleting old docente record for ${oldEmail}...`);
  const { error: delDocErr } = await supabase
    .from('docentes')
    .delete()
    .eq('id', oldDocenteId);
  if (delDocErr) console.error("Error deleting old docente:", delDocErr.message);
  else console.log("Old docente record deleted.");

  // 6. Eliminar el perfil del docente antiguo de public.perfiles
  console.log(`Deleting old profile for ${oldEmail}...`);
  const { error: delPerfErr } = await supabase
    .from('perfiles')
    .delete()
    .eq('id', oldDocenteId);
  if (delPerfErr) console.error("Error deleting old profile:", delPerfErr.message);
  else console.log("Old profile record deleted.");

  // 7. Eliminar la cuenta antigua de Auth
  console.log(`Deleting old Auth user for ${oldEmail}...`);
  const { error: delAuthErr } = await supabase.auth.admin.deleteUser(oldDocenteId);
  if (delAuthErr) console.error("Error deleting old Auth user:", delAuthErr.message);
  else console.log("Old Auth user deleted.");

  console.log("=== REASSIGNMENT COMPLETE ===");
}

main().catch(console.error);
