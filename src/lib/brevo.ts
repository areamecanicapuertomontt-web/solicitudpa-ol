// Brevo REST API — sin SDK, usa fetch nativo para máxima compatibilidad

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

const SENDER = {
  name:  process.env.BREVO_SENDER_NAME  || 'Área Mecánica INACAP',
  email: process.env.BREVO_SENDER_EMAIL || 'diego.henriquez34@gmail.com',
}

async function enviarCorreoViaResend(
  to: string,
  toName: string,
  subject: string,
  htmlContent: string
) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('No se ha configurado la llave API de Resend (RESEND_API_KEY)')
  }

  const senderName = process.env.BREVO_SENDER_NAME || 'Área Mecánica INACAP'
  const senderEmail = process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev'

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  const body = {
    from: `${senderName} <${senderEmail}>`,
    to: [to],
    subject,
    html: htmlContent,
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend HTTP ${res.status}: ${err}`)
  }

  return await res.json()
}

async function logFailedEmail(
  to: string,
  toName: string,
  subject: string,
  errorBrevo: string,
  errorResend: string
) {
  const logMsg = `[FATAL EMAIL ERROR] No se pudo enviar correo a: ${to} (${toName}). Asunto: "${subject}". Brevo error: ${errorBrevo}. Resend error: ${errorResend}`
  console.error(logMsg)

  try {
    const { createServerClient } = await import('@/lib/supabase-server')
    const supabase = createServerClient()
    const { error } = await supabase
      .from('correos_fallidos')
      .insert({
        destinatario: to,
        destinatario_nombre: toName,
        asunto: subject,
        error_brevo: errorBrevo,
        error_resend: errorResend
      })
    if (error) {
      console.error('[supabase] Error al guardar log de correo fallido:', error.message)
    }
  } catch (err: any) {
    console.error('[supabase] Error de conexión para guardar log de correo fallido:', err.message)
  }
}

async function enviarCorreo(
  to: string,
  toName: string,
  subject: string,
  htmlContent: string
) {
  const rawKeys = process.env.BREVO_API_KEY || ''
  const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean)

  let lastBrevoError = null

  // 1. Intentar con Brevo (rotando llaves)
  if (apiKeys.length > 0) {
    for (let i = 0; i < apiKeys.length; i++) {
      const key = apiKeys[i]
      try {
        const headers = {
          'accept': 'application/json',
          'api-key': key,
          'content-type': 'application/json',
        }

        const body = {
          sender: SENDER,
          to: [{ email: to, name: toName }],
          subject,
          htmlContent,
        }

        const res = await fetch(BREVO_API_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const err = await res.text()
          throw new Error(`HTTP ${res.status}: ${err}`)
        }

        console.log(`[Brevo] Correo enviado exitosamente usando llave #${i + 1}`)
        return await res.json()
      } catch (e: any) {
        console.warn(`[Brevo] Error al enviar con la llave #${i + 1}:`, e.message)
        lastBrevoError = e
      }
    }
  } else {
    lastBrevoError = new Error('No se han configurado llaves API de Brevo (BREVO_API_KEY)')
  }

  // 2. Si Brevo falla, intentar con Resend como fallback
  console.log('[Email] Brevo falló o no está configurado. Intentando fallback con Resend...')
  try {
    const res = await enviarCorreoViaResend(to, toName, subject, htmlContent)
    console.log('[Resend] Correo enviado exitosamente a través de Resend!')
    return res
  } catch (resendErr: any) {
    const errorBrevo = lastBrevoError?.message || 'Sin configuración de llaves Brevo'
    const errorResend = resendErr.message || 'Error desconocido de Resend'

    // Loguear error de correo fallido en base de datos y consola
    await logFailedEmail(to, toName, subject, errorBrevo, errorResend)

    throw new Error(`Error de envío de correo. Brevo: ${errorBrevo}. Resend: ${errorResend}`)
  }
}

// ─── Tabla de items ────────────────────────────────────────────────────────
function tablaItems(items: { cantidad: number; descripcion: string; estado_item?: string }[]) {
  const filas = items.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;">${i.cantidad}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${i.descripcion}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px;">${i.estado_item || '—'}</td>
    </tr>`).join('')
  return `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:14px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;text-align:center;font-size:11px;text-transform:uppercase;color:#6b7280;">Cant.</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;">Descripción</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;">Estado</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>`
}

function layout(contenido: string) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#0D1B2A;padding:24px 32px;">
            <table width="100%"><tr>
              <td>
                <span style="display:inline-block;width:4px;height:36px;background:#E63946;vertical-align:middle;border-radius:2px;margin-right:12px;"></span>
                <span style="display:inline-block;vertical-align:middle;">
                  <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#E63946;">Área Mecánica</div>
                  <div style="font-size:20px;font-weight:900;color:#fff;">INACAP</div>
                </span>
              </td>
              <td align="right"><span style="font-size:12px;color:#8B9BB4;">Pañol Mecánico</span></td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="padding:32px;">${contenido}</td></tr>
        <tr>
          <td style="background:#f9fafb;padding:18px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              Correo automático — Sistema Pañol Mecánico INACAP. No respondas a este correo.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function filasDatos(datos: [string, string][]) {
  return datos.map(([k, v]) => `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#6b7280;width:120px;">${k}</td>
      <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${v}</td>
    </tr>`).join('')
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ALUMNO — Confirmación de solicitud enviada
// ═══════════════════════════════════════════════════════════════════════════
export async function enviarCorreoAlumnoConfirmacion(params: {
  alumnoEmail: string; alumnoNombre: string; alumnoRut: string
  docenteNombre: string; asignatura: string; seccion: string
  jornada: string; fecha: string
  items: { cantidad: number; descripcion: string; estado_item?: string }[]
}) {
  const html = layout(`
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:900;color:#111827;">¡Solicitud Enviada!</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Tu solicitud fue recibida. Espera la aprobación del docente.</p>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#92400e;">⏳ <strong>Pendiente de aprobación</strong> — Te notificaremos cuando el docente responda.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${filasDatos([
        ['Alumno', params.alumnoNombre], ['RUT', params.alumnoRut],
        ['Docente', params.docenteNombre], ['Asignatura', params.asignatura],
        ['Sección', params.seccion], ['Jornada', params.jornada], ['Fecha', params.fecha],
      ])}
    </table>
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;">Materiales solicitados</p>
    ${tablaItems(params.items)}
  `)
  return enviarCorreo(params.alumnoEmail, params.alumnoNombre, '✅ Tu solicitud de material fue enviada — INACAP', html)
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. ALUMNO — Notificación de resultado (aprobado o rechazado)
// ═══════════════════════════════════════════════════════════════════════════
export async function enviarCorreoAlumnoResultado(params: {
  alumnoEmail: string; alumnoNombre: string; aprobada: boolean
  docenteNombre: string; asignatura: string
  items: { cantidad: number; descripcion: string; estado_item?: string }[]
  motivoRechazo?: string
}) {
  const color   = params.aprobada ? '#22C55E' : '#EF4444'
  const bgColor = params.aprobada ? '#f0fdf4' : '#fef2f2'
  const icono   = params.aprobada ? '✅' : '❌'
  const titulo  = params.aprobada ? '¡Tu solicitud fue Aprobada!' : 'Tu solicitud fue Rechazada'
  const mensaje = params.aprobada
    ? 'El docente aprobó tu solicitud. <strong>Preséntate al pañol mecánico con tu RUT para retirar los materiales.</strong>'
    : `El docente rechazó tu solicitud.${params.motivoRechazo ? ` Motivo del rechazo: <strong>"${params.motivoRechazo}"</strong>.` : ' Si tienes dudas, contacta directamente a tu docente.'}`

  const html = layout(`
    <div style="background:${bgColor};border:1px solid ${color}40;border-radius:10px;padding:20px;margin-bottom:20px;text-align:center;">
      <p style="margin:0 0 4px;font-size:28px;">${icono}</p>
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:900;color:#111827;">${titulo}</h2>
      <p style="margin:0;font-size:14px;color:#374151;">${mensaje}</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${filasDatos([
        ['Docente', params.docenteNombre], ['Asignatura', params.asignatura],
        ['Estado', params.aprobada ? 'APROBADA ✅' : 'RECHAZADA ❌'],
      ])}
    </table>
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;">Materiales de la solicitud</p>
    ${tablaItems(params.items)}
  `)

  const asunto = params.aprobada
    ? `✅ Solicitud aprobada — ${params.asignatura}`
    : `❌ Solicitud rechazada — ${params.asignatura}`

  return enviarCorreo(params.alumnoEmail, params.alumnoNombre, asunto, html)
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. DOCENTE — Solicitud pendiente de aprobación
// ═══════════════════════════════════════════════════════════════════════════
export async function enviarCorreoDocente(params: {
  docenteEmail: string; docenteNombre: string; alumnoNombre: string; alumnoRut: string
  asignatura: string; seccion: string; jornada: string; fecha: string
  items: { cantidad: number; descripcion: string; estado_item?: string }[]
  tokenAprobacion: string; solicitudId: string; siteUrl: string
}) {
  const urlDetalles = `${params.siteUrl}/aprobar/${params.tokenAprobacion}`

  const html = layout(`
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:900;color:#111827;">Solicitud de Material</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Estimado/a <strong>${params.docenteNombre}</strong>, un alumno ha ingresado una solicitud de materiales en el sistema bajo tu asignatura. Se requiere tu revisión y aprobación para autorizar el préstamo en el pañol.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${filasDatos([
        ['Alumno', params.alumnoNombre], ['RUT', params.alumnoRut],
        ['Asignatura', params.asignatura], ['Sección', params.seccion],
        ['Jornada', params.jornada], ['Fecha', params.fecha],
      ])}
    </table>
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;">Materiales solicitados</p>
    ${tablaItems(params.items)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td align="center">
          <a href="${urlDetalles}" style="display:inline-block;background:#E63946;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;text-align:center;font-weight:700;font-size:15px;min-width:200px;">📋 Ver Detalles y Decidir</a>
        </td>
      </tr>
    </table>
    <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;text-align:center;">Deberás iniciar sesión con tu cuenta de docente de INACAP.</p>
  `)

  return enviarCorreo(params.docenteEmail, params.docenteNombre, `📋 Solicitud de material pendiente — ${params.alumnoNombre}`, html)
}

// ═══════════════════════════════════════════════════════════════════════════
// 3b. DOCENTE & DIRECTOR — Alerta de materiales no devueltos
// ═══════════════════════════════════════════════════════════════════════════
export async function enviarCorreoAdvertenciaFaltaMaterial(params: {
  docenteEmail: string
  docenteNombre: string
  directorEmail: string
  alumnoNombre: string
  alumnoRut: string
  asignatura: string
  seccion: string
  jornada: string
  itemsFaltantes: { cantidad: number; descripcion: string; estado_item?: string }[]
  solicitudId: string
}) {
  const filas = params.itemsFaltantes.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;color:#dc2626;">${i.cantidad}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${i.descripcion}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-size:12px;font-weight:700;text-align:center;">PENDIENTE ⚠️</td>
    </tr>`).join('')
    
  const tablaFaltantes = `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:14px;">
      <thead>
        <tr style="background:#fef2f2;">
          <th style="padding:8px 12px;border-bottom:2px solid #fca5a5;text-align:center;font-size:11px;text-transform:uppercase;color:#b91c1c;">Cant.</th>
          <th style="padding:8px 12px;border-bottom:2px solid #fca5a5;text-align:left;font-size:11px;text-transform:uppercase;color:#b91c1c;">Descripción</th>
          <th style="padding:8px 12px;border-bottom:2px solid #fca5a5;text-align:center;font-size:11px;text-transform:uppercase;color:#b91c1c;">Estado Retorno</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>`

  const html = layout(`
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:16px;margin-bottom:20px;">
      <h3 style="margin:0 0 4px;font-size:16px;font-weight:900;color:#991b1b;">⚠️ ALERTA: Materiales no Devueltos</h3>
      <p style="margin:0;font-size:13px;color:#7f1d1d;">El alumno realizó una devolución parcial, quedando herramientas pendientes de retornar al pañol mecánico.</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${filasDatos([
        ['Alumno', params.alumnoNombre], ['RUT', params.alumnoRut],
        ['Asignatura', params.asignatura], ['Sección', `${params.seccion} (${params.jornada})`],
        ['N° Solicitud', params.solicitudId.slice(0, 8).toUpperCase()],
      ])}
    </table>

    <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;color:#b91c1c;">Detalle de herramientas faltantes</p>
    ${tablaFaltantes}

    <div style="background:#f3f4f6;border-radius:10px;padding:14px;margin-top:24px;font-size:12px;color:#4b5563;">
      <p style="margin:0;line-height:1.5;">Este correo es enviado al docente a cargo y al Director de Carrera para el control del equipamiento del taller.</p>
    </div>
  `)

  // Enviar correo al docente
  try {
    await enviarCorreo(params.docenteEmail, params.docenteNombre, `⚠️ Alerta: Material pendiente de devolución — ${params.alumnoNombre}`, html)
  } catch (e: any) {
    console.error(`Error enviando correo de alerta al docente (${params.docenteEmail}):`, e.message)
  }

  // Enviar correo al director de carrera
  if (params.directorEmail) {
    try {
      await enviarCorreo(params.directorEmail, 'Director de Carrera', `⚠️ Alerta: Material pendiente de devolución — ${params.alumnoNombre}`, html)
    } catch (e: any) {
      console.error(`Error enviando correo de alerta al Director (${params.directorEmail}):`, e.message)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. PAÑOL — Solicitud aprobada, preparar materiales
// ═══════════════════════════════════════════════════════════════════════════
export async function enviarCorreoPanol(params: {
  pañolEmail: string; alumnoNombre: string; alumnoRut: string
  docenteNombre: string; asignatura: string; seccion: string
  jornada: string; fecha: string
  items: { cantidad: number; descripcion: string; estado_item?: string }[]
  solicitudId: string
  codigoEntrega: string
}) {
  const html = layout(`
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;color:#166534;font-weight:700;">✅ Solicitud Aprobada — Preparar materiales</p>
      <p style="margin:4px 0 0;font-size:13px;color:#166534;">El docente aprobó. Prepara los materiales para entrega.</p>
    </div>

    <div style="background:#0D1B2A;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#8B9BB4;">Código de Entrega</p>
      <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:.25em;color:#E63946;font-family:monospace;">${params.codigoEntrega}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#8B9BB4;">Ingresa este código en el panel al momento de entregar</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${filasDatos([
        ['Alumno', params.alumnoNombre], ['RUT', params.alumnoRut],
        ['Docente', params.docenteNombre], ['Asignatura', params.asignatura],
        ['Sección', `${params.seccion} (${params.jornada})`], ['Fecha', params.fecha],
        ['N° Solicitud', params.solicitudId.slice(0, 8).toUpperCase()],
      ])}
    </table>
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;">Materiales a preparar</p>
    ${tablaItems(params.items)}
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 18px;margin-top:20px;">
      <p style="margin:0;font-size:13px;color:#1e40af;">📌 El alumno presenta su RUT para retirar. Marca la entrega en el panel de control.</p>
    </div>
  `)

  return enviarCorreo(params.pañolEmail, 'Pañol Mecánico', `📦 Materiales para preparar — ${params.alumnoNombre}`, html)
}
