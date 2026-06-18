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

async function testBrevo(to, toName) {
  console.log(`\n[Brevo] Sending to ${to}...`);
  const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
  const headers = {
    'accept': 'application/json',
    'api-key': env.BREVO_API_KEY,
    'content-type': 'application/json',
  };

  const body = {
    sender: { name: 'Área Mecánica INACAP', email: env.BREVO_SENDER_EMAIL },
    to: [{ email: to, name: toName }],
    subject: '🧪 Test Directo Brevo',
    htmlContent: '<p>Hola, esta es una prueba de envío directo desde Brevo.</p>',
  };

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log(`[Brevo] Status: ${res.status}. Response: ${text}`);
  } catch (err) {
    console.error("[Brevo] Error:", err.message);
  }
}

async function main() {
  const targetDocente = 'victor.marin02@inacapmail.cl';
  const targetAlumno = 'diego.henriquez34@inacapmail.cl';

  await testBrevo(targetAlumno, 'Diego Alumno');
  await testBrevo(targetDocente, 'Victor Docente');
}

main().catch(console.error);
