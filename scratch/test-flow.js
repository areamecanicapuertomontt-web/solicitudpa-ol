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

async function runTest() {
  console.log("=== INICIANDO TESTEO GENERAL DE FLUJO ===");
  
  // 1. Obtener un docente de prueba
  console.log("\n[1] Consultando docentes disponibles...");
  const { data: docentes, error: errDocentes } = await supabase
    .from('docentes')
    .select('id, nombre, email')
    .eq('activo', true)
    .limit(1);

  if (errDocentes || !docentes || docentes.length === 0) {
    console.error("❌ No se encontraron docentes activos en la base de datos.");
    return;
  }
  const targetDocente = docentes[0];
  console.log(`✅ Usando docente: ${targetDocente.nombre} (${targetDocente.email})`);

  // 2. Crear solicitud de prueba (Alumno)
  console.log("\n[2] Creando solicitud de alumno de prueba...");
  const tokenAprobacion = "test-token-" + Math.random().toString(36).substring(2, 10);
  const codigoEntrega = Math.floor(100000 + Math.random() * 900000).toString(); // Código de 6 dígitos
  
  const { data: solicitud, error: errSolicitud } = await supabase
    .from('solicitudes')
    .insert([{
      alumno: "Diego Henriquez (Test Alumno)",
      rut: "12.345.678-9",
      alumno_email: "diego.henriquez34@inacapmail.cl",
      asignatura: "Taller Mecánico Avanzado",
      seccion: "A01_TEST",
      jornada: "D",
      fecha: new Date().toISOString().split('T')[0],
      estado: "PENDIENTE",
      docente_id: targetDocente.id,
      token_aprobacion: tokenAprobacion,
      codigo_entrega: codigoEntrega,
      observaciones: "Prueba automatizada de flujo de integración"
    }])
    .select()
    .single();

  if (errSolicitud || !solicitud) {
    console.error("❌ Error al crear la solicitud de alumno:", errSolicitud?.message || "No data");
    return;
  }
  console.log(`✅ Solicitud creada con ID: ${solicitud.id} (Estado: ${solicitud.estado})`);

  // 2.1 Crear items para la solicitud
  console.log("\n[2.1] Creando ítems para la solicitud...");
  const { data: items, error: errItems } = await supabase
    .from('items_solicitud')
    .insert([
      { solicitud_id: solicitud.id, cantidad: 2, descripcion: "Llave de Torque 1/2", estado_item: "CUALQUIERA" },
      { solicitud_id: solicitud.id, cantidad: 1, descripcion: "Gata Hidráulica 2T", estado_item: "CUALQUIERA" }
    ])
    .select();

  if (errItems || !items || items.length === 0) {
    console.error("❌ Error al crear ítems de la solicitud:", errItems?.message);
    // Limpiar solicitud creada
    await supabase.from('solicitudes').delete().eq('id', solicitud.id);
    return;
  }
  console.log(`✅ Se crearon ${items.length} ítems de prueba.`);

  // 3. Simular Aprobación del Profesor (Docente)
  console.log("\n[3] Simulando aprobación del docente...");
  const { data: solicitudAprobada, error: errAprobar } = await supabase
    .from('solicitudes')
    .update({ estado: 'APROBADA' })
    .eq('id', solicitud.id)
    .select()
    .single();

  if (errAprobar || !solicitudAprobada || solicitudAprobada.estado !== 'APROBADA') {
    console.error("❌ Error al actualizar estado a APROBADA:", errAprobar?.message);
    await cleanUp(solicitud.id);
    return;
  }
  console.log(`✅ Solicitud aprobada con éxito. (Estado: ${solicitudAprobada.estado})`);

  // 4. Simular Entrega del Pañolero (Entrega con Código)
  console.log("\n[4] Simulando entrega del pañolero...");
  const { data: solicitudEntregada, error: errEntregar } = await supabase
    .from('solicitudes')
    .update({ estado: 'ENTREGADA' })
    .eq('id', solicitud.id)
    .select()
    .single();

  if (errEntregar || !solicitudEntregada || solicitudEntregada.estado !== 'ENTREGADA') {
    console.error("❌ Error al actualizar estado a ENTREGADA (En Préstamo):", errEntregar?.message);
    await cleanUp(solicitud.id);
    return;
  }
  console.log(`✅ Herramientas entregadas. (Estado: ${solicitudEntregada.estado})`);

  // 5. Simular Devolución Parcial (Falta Material)
  console.log("\n[5] Simulando devolución parcial (un item devuelto, otro no)...");
  // Marcamos la Gata Hidráulica como devuelta y la Llave de Torque no devuelta.
  const gataItem = items.find(i => i.descripcion.includes("Gata"));
  const torqueItem = items.find(i => i.descripcion.includes("Torque"));

  if (gataItem) {
    const { error: errUpdateItem } = await supabase
      .from('items_solicitud')
      .update({ devuelto: true })
      .eq('id', gataItem.id);

    if (errUpdateItem) {
      console.error("❌ Error al actualizar estado del ítem Gata:", errUpdateItem.message);
      await cleanUp(solicitud.id);
      return;
    }
  }

  const { data: solicitudIncompleta, error: errIncompleta } = await supabase
    .from('solicitudes')
    .update({ estado: 'DEVUELTA_INCOMPLETA' })
    .eq('id', solicitud.id)
    .select()
    .single();

  if (errIncompleta || !solicitudIncompleta || solicitudIncompleta.estado !== 'DEVUELTA_INCOMPLETA') {
    console.error("❌ Error al actualizar estado a DEVUELTA_INCOMPLETA:", errIncompleta?.message);
    await cleanUp(solicitud.id);
    return;
  }
  console.log(`✅ Devolución parcial procesada con éxito. (Estado: ${solicitudIncompleta.estado} - Alerta enviada)`);

  // 6. Simular Devolución Total (Listo / Historial)
  console.log("\n[6] Simulando devolución del material restante (devolución completa)...");
  if (torqueItem) {
    const { error: errUpdateItem2 } = await supabase
      .from('items_solicitud')
      .update({ devuelto: true })
      .eq('id', torqueItem.id);

    if (errUpdateItem2) {
      console.error("❌ Error al actualizar estado del ítem Torque:", errUpdateItem2.message);
      await cleanUp(solicitud.id);
      return;
    }
  }

  const { data: solicitudFinalizada, error: errFinalizada } = await supabase
    .from('solicitudes')
    .update({ estado: 'DEVUELTA' })
    .eq('id', solicitud.id)
    .select()
    .single();

  if (errFinalizada || !solicitudFinalizada || solicitudFinalizada.estado !== 'DEVUELTA') {
    console.error("❌ Error al actualizar estado a DEVUELTA (Finalizada):", errFinalizada?.message);
    await cleanUp(solicitud.id);
    return;
  }
  console.log(`✅ Devolución finalizada. (Estado: ${solicitudFinalizada.estado})`);

  // 7. Limpieza de datos del test
  console.log("\n[7] Limpiando registros de prueba...");
  await cleanUp(solicitud.id);
  console.log("✅ Registros eliminados de la base de datos.");

  console.log("\n==========================================");
  console.log("🎉 ¡TEST COMPLETADO CON ÉXITO SIN ERRORES!");
  console.log("==========================================");
}

async function cleanUp(solicitudId) {
  // Los ítems se eliminan en cascada en la base de datos o los eliminamos explícitamente
  await supabase.from('items_solicitud').delete().eq('solicitud_id', solicitudId);
  await supabase.from('solicitudes').delete().eq('id', solicitudId);
}

runTest().catch(console.error);
