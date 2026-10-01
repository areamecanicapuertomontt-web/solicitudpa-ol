// scripts/cargar-usuarios.mjs
// Carga masiva de usuarios (alumnos, docentes, pañol, admin) desde un CSV.
//
// Uso:
//   node scripts/cargar-usuarios.mjs ruta/al/archivo.csv
//
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// y DEFAULT_STUDENT_PASSWORD (contraseña inicial para todos los usuarios cargados).
//
// Formato del CSV (con encabezado, separado por comas). Ver scripts/usuarios.ejemplo.csv
//   email,nombre,rol,rut,jornada,seccion,carrera,asignatura
//   - rol: ALUMNO | DOCENTE | PANOL | ADMIN
//   - jornada: D | V (sólo alumnos)
//   - asignatura: sólo DOCENTE → además lo registra en la tabla `docentes`
//     (con el mismo id que su usuario) para que aparezca en el formulario.
//
// Es seguro re-ejecutarlo: si el email ya existe, lo informa y sigue con el siguiente.
// ⚠️ Los CSV con datos reales de alumnos NO se suben a GitHub (están en .gitignore).

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

try { process.loadEnvFile('.env.local') } catch { /* también puede venir del entorno */ }

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceKey, DEFAULT_STUDENT_PASSWORD: password } = process.env
const archivo = process.argv[2]

if (!url || !serviceKey || !password) {
  console.error('❌ Faltan variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o DEFAULT_STUDENT_PASSWORD')
  process.exit(1)
}
if (!archivo) {
  console.error('Uso: node scripts/cargar-usuarios.mjs archivo.csv')
  process.exit(1)
}

const ROLES = ['ALUMNO', 'DOCENTE', 'PANOL', 'ADMIN']
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const [encabezado, ...lineas] = readFileSync(archivo, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
const columnas = encabezado.split(',').map(c => c.trim().toLowerCase())
const filas = lineas.map(l => Object.fromEntries(l.split(',').map((v, i) => [columnas[i], v.trim() || null])))

let creados = 0, omitidos = 0, errores = 0

for (const f of filas) {
  const email = f.email?.toLowerCase()
  const rol = (f.rol || 'ALUMNO').toUpperCase()
  if (!email || !f.nombre || !ROLES.includes(rol)) {
    console.warn(`⚠️  Fila inválida, se omite: ${JSON.stringify(f)}`)
    errores++
    continue
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: f.nombre, rol, rut: f.rut, jornada: f.jornada, seccion: f.seccion, carrera: f.carrera },
  })

  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      console.log(`↷  Ya existe: ${email}`)
      omitidos++
    } else {
      console.error(`❌ ${email}: ${error.message}`)
      errores++
    }
    continue
  }

  if (rol === 'DOCENTE' && f.asignatura) {
    const { error: docErr } = await supabase
      .from('docentes')
      .upsert({ id: data.user.id, nombre: f.nombre, email, asignatura: f.asignatura, activo: true }, { onConflict: 'email' })
    if (docErr) console.error(`   ⚠️ No se pudo registrar en docentes: ${docErr.message}`)
  }

  console.log(`✅ ${rol.padEnd(7)} ${email}`)
  creados++
}

console.log(`\nResumen: ${creados} creados · ${omitidos} ya existían · ${errores} con error`)
