# Sistema de Solicitudes de Pañol — Área Mecánica · INACAP Puerto Montt

Aplicación web progresiva (PWA) para gestionar el préstamo de herramientas y materiales del pañol del Área Mecánica.
El alumno solicita, el docente aprueba, el pañol entrega con un código o QR y registra la devolución.

Desarrollada en la práctica profesional de junio–julio 2026. La **documentación técnica completa** (formato INACAP) está en [`docs/Documentacion_Tecnica_Sistema_Panol.docx`](docs/Documentacion_Tecnica_Sistema_Panol.docx).

> [!IMPORTANT]
> **La base de datos y el correo NO vienen incluidos.** El proyecto de Supabase original y la cuenta de Brevo (correo) pertenecen al equipo anterior y no se traspasan.
> Hay que **crear un proyecto Supabase nuevo** y **una cuenta Brevo nueva** siguiendo la [puesta en marcha](#puesta-en-marcha). Todo el esquema está en [`supabase/schema.sql`](supabase/schema.sql).

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend + API | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5 |
| Estilos | Tailwind CSS 4 · lucide-react |
| Formularios | react-hook-form + zod |
| Backend | Supabase: PostgreSQL, Auth, Realtime y Edge Functions |
| Notificaciones | Web Push nativo (VAPID) mediante la Edge Function `send-push` |
| Correo | Brevo como SMTP de Supabase Auth (recuperación de contraseña) |
| Hosting | Vercel · keep-alive con GitHub Actions |

> [!WARNING]
> Next.js 16 trae cambios incompatibles con versiones anteriores. Por ejemplo, `middleware.ts` ahora se llama `src/proxy.ts`. Antes de programar, revisen la guía incluida en `node_modules/next/dist/docs/` (ver `AGENTS.md`).

## Roles y flujo

| Rol | Puede |
|---|---|
| `ALUMNO` | Crear solicitudes, ver su estado y mostrar el código o QR de retiro |
| `DOCENTE` | Aprobar o rechazar las solicitudes de sus asignaturas |
| `PANOL` | Entregar materiales (con código o QR), registrar devoluciones y administrar equipos y alumnos |
| `ADMIN` | Todo lo anterior, además de forzar estados, eliminar registros y cambiar roles |

```
PENDIENTE ──(docente aprueba → código de 6 dígitos)──▶ APROBADA ──(pañol valida código)──▶ ENTREGADA
    │                                                                                    │
    └──(docente rechaza + motivo)──▶ RECHAZADA                  devolución completa ─────┤──▶ DEVUELTA
                                                                devolución parcial ──────┴──▶ DEVUELTA_INCOMPLETA
```

## Puesta en marcha

Requisitos: Node.js 20 o superior, una cuenta en GitHub, Supabase, Vercel y Brevo. Todas tienen plan gratuito.

### 1. Clonar e instalar

```bash
git clone https://github.com/areamecanicapuertomontt-web/solicitudpa-ol.git
cd solicitudpa-ol
npm install
cp .env.example .env.local
```

### 2. Base de datos (Supabase)

1. Crear un proyecto en [supabase.com](https://supabase.com). Región sugerida: São Paulo (`sa-east-1`).
2. Ir a **SQL Editor**, pegar y ejecutar [`supabase/schema.sql`](supabase/schema.sql).
3. Pegar y ejecutar [`supabase/seed.sql`](supabase/seed.sql). Carga las asignaturas y el plan de mantención.
4. En **Project Settings → API**, copiar en `.env.local` estos tres valores: `URL`, `anon key` y `service_role key`.

### 3. Notificaciones push (Edge Function)

```bash
npx web-push generate-vapid-keys
npx supabase login
npx supabase link --project-ref <ID_DEL_PROYECTO>
npx supabase secrets set VAPID_PUBLIC_KEY=<publica> VAPID_PRIVATE_KEY=<privada> VAPID_SUBJECT=mailto:<correo-del-area>
npx supabase functions deploy send-push
```

Copiar la clave pública VAPID en `NEXT_PUBLIC_VAPID_PUBLIC_KEY` de `.env.local`.

### 4. Correo (Brevo → SMTP de Supabase)

El correo de "Olvidé mi contraseña" lo envía Supabase Auth. El SMTP que trae Supabase por defecto **solo envía a los miembros del equipo del proyecto**, así que para los alumnos hace falta un SMTP propio:

1. Crear una cuenta en [brevo.com](https://www.brevo.com) y verificar el remitente en **Senders & IP**.
2. En Brevo, ir a **SMTP & API → SMTP** y generar una *SMTP key*.
3. En Supabase, ir a **Authentication → Emails → SMTP Settings** y configurar:
   - Host: `smtp-relay.brevo.com`
   - Puerto: `587`
   - Usuario: el login SMTP de Brevo
   - Contraseña: la SMTP key
   - Remitente: el correo verificado
4. En **Authentication → Emails → Templates → Reset Password**, pegar [`supabase/templates/restablecer-contrasena.html`](supabase/templates/restablecer-contrasena.html).
5. En **Authentication → URL Configuration**, poner la *Site URL* de Vercel y agregar `https://<tu-app>/restablecer-contrasena` en *Redirect URLs*.

### 5. Usuarios

```bash
# Completar DEFAULT_STUDENT_PASSWORD en .env.local y preparar un CSV como scripts/usuarios.ejemplo.csv
node scripts/cargar-usuarios.mjs mis-usuarios.csv
```

El primer `ADMIN` se crea así. Después, los alumnos también se pueden crear desde `/admin`.

### 6. Ejecutar y desplegar

```bash
npm run dev     # http://localhost:3000
npm run build   # verificación de producción
```

En Vercel:

1. Importar el repo y cargar las mismas variables de `.env.local`.
2. En GitHub, ir a **Settings → Secrets and variables → Actions → Variables** y crear `KEEPALIVE_URL` con el valor `https://<tu-app>.vercel.app/api/keepalive`.

## Estructura

```
src/
  proxy.ts               Protección de rutas por sesión y rol (antes "middleware")
  app/                   Páginas (App Router) y rutas API (app/api/**/route.ts)
  components/            Componentes de UI (stepper, campana, PWA, ayuda)
  hooks/useAuthProfile   Carga del perfil y control de acceso por rol en el cliente
  lib/                   Clientes Supabase, auth de API, push, tipos y utilidades
public/sw.js             Service worker (caché y notificaciones push)
supabase/
  schema.sql             Esquema completo: tablas, funciones, RLS y realtime
  seed.sql               Datos base: asignaturas y plan de mantención
  functions/send-push    Edge Function de Web Push
  templates/             Plantilla del correo de recuperación
scripts/                 Carga masiva de usuarios desde CSV
docs/                    Documentación técnica (formato INACAP)
```

## Seguridad

- `.env.local` y los CSV con datos de alumnos **nunca** se suben al repositorio. El repo es público.
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el servidor. Las rutas `/api` validan sesión y rol con `src/lib/api-auth.ts`.
- Los roles se leen desde la tabla `perfiles`, no desde `user_metadata`, porque el propio usuario puede editar su `user_metadata`.
