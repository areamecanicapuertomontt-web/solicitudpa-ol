import { NextRequest } from 'next/server'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

async function enviar(to: string, toName: string, subject: string, htmlContent: string) {
  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY!,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'Área Mecánica INACAP',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent,
    }),
  })
  const text = await res.text()
  let json: unknown
  try { json = JSON.parse(text) } catch { json = text }
  return { ok: res.ok, status: res.status, to, body: json }
}

export async function GET(_request: NextRequest) {
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const apiKey = process.env.BREVO_API_KEY

  if (!apiKey) return Response.json({ error: 'BREVO_API_KEY no configurada' }, { status: 500 })

  const html = (rol: string, color: string, emoji: string) => `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:32px;">
      <div style="background:${color};padding:20px;border-radius:12px;text-align:center;margin-bottom:20px;">
        <p style="font-size:32px;margin:0;">${emoji}</p>
        <h2 style="color:white;margin:8px 0 0;">Correo de prueba — ${rol}</h2>
      </div>
      <p style="color:#374151;">Si recibes este correo, la configuración para <strong>${rol}</strong> funciona correctamente.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
      <p style="color:#6b7280;font-size:12px;">
        Remitente: <strong>${senderEmail}</strong><br>
        Hora: <strong>${new Date().toLocaleString('es-CL')}</strong>
      </p>
    </div>`

  // Enviar a los 3 correos en paralelo
  const [alumno, profesor, panol] = await Promise.allSettled([
    enviar(
      'diego.henriquez34@inacapmail.cl', 'Diego Alumno',
      '🎓 Prueba Alumno — INACAP Pañol',
      html('Alumno', '#3B82F6', '🎓')
    ),
    enviar(
      'diegohenriquez176@gmail.com', 'Diego Profesor',
      '👨‍🏫 Prueba Profesor — INACAP Pañol',
      html('Profesor', '#8B5CF6', '👨‍🏫')
    ),
    enviar(
      'diegohen2005gonzales@gmail.com', 'Diego Pañol',
      '📦 Prueba Pañol — INACAP Pañol',
      html('Pañol', '#10B981', '📦')
    ),
  ])

  const resultado = {
    config: {
      senderEmail,
      apiKeyPreview: `${apiKey.slice(0, 12)}...${apiKey.slice(-6)}`,
    },
    resultados: {
      alumno:  alumno.status === 'fulfilled'  ? alumno.value  : { ok: false, error: String(alumno.reason) },
      profesor: profesor.status === 'fulfilled' ? profesor.value : { ok: false, error: String(profesor.reason) },
      panol:   panol.status === 'fulfilled'   ? panol.value   : { ok: false, error: String(panol.reason) },
    },
  }

  return Response.json(resultado, { status: 200 })
}
