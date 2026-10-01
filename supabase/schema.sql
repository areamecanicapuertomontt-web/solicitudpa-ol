-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  ESQUEMA COMPLETO — Sistema de Solicitudes de Pañol                      ║
-- ║  INACAP Puerto Montt · Área Mecánica                                     ║
-- ║                                                                          ║
-- ║  Uso: Supabase → SQL Editor → New query → pegar TODO → Run               ║
-- ║  Ejecutar sobre un proyecto NUEVO y vacío. Luego ejecutar seed.sql.      ║
-- ║                                                                          ║
-- ║  Este archivo consolida los scripts sueltos usados durante el desarrollo ║
-- ║  (junio–julio 2026) e incluye las funciones y políticas que existían     ║
-- ║  sólo en la base de datos original.                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TABLAS
-- ═══════════════════════════════════════════════════════════════════════════

-- Perfil de cada usuario de Supabase Auth (se crea solo, vía trigger)
CREATE TABLE IF NOT EXISTS public.perfiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol         TEXT NOT NULL DEFAULT 'ALUMNO'
              CHECK (rol IN ('ADMIN', 'DOCENTE', 'ALUMNO', 'PANOL')),
  nombre      TEXT,
  rut         TEXT,
  email       TEXT,
  jornada     TEXT CHECK (jornada IN ('D', 'V')),
  seccion     TEXT,
  carrera     TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  last_seen   TIMESTAMPTZ,              -- presencia del personal de pañol
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Docentes que aparecen en el formulario de solicitud.
-- Para que un docente pueda iniciar sesión y aprobar, además debe existir un
-- usuario en Auth con rol DOCENTE y el MISMO email.
CREATE TABLE IF NOT EXISTS public.docentes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  asignatura  TEXT NOT NULL,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Malla de asignaturas por carrera (IMI = Ing. en Mantenimiento Industrial, MI = Ing. en Mecánica y Electromovilidad Automotriz)
CREATE TABLE IF NOT EXISTS public.asignaturas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo      TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  tipo        TEXT CHECK (tipo IN ('PRÁCTICA', 'LECTIVA')),
  horas       INTEGER NOT NULL,
  requisitos  TEXT,
  carrera     TEXT NOT NULL CHECK (carrera IN ('IMI', 'MI')),
  nivel       INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (codigo, carrera)
);

-- Solicitud de préstamo de herramientas/materiales
CREATE TABLE IF NOT EXISTS public.solicitudes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alumno            TEXT NOT NULL,
  rut               TEXT NOT NULL,
  alumno_email      TEXT,
  asignatura        TEXT NOT NULL,
  seccion           TEXT NOT NULL,
  jornada           TEXT NOT NULL CHECK (jornada IN ('D', 'V')),
  carrera           TEXT,
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  estado            TEXT NOT NULL DEFAULT 'PENDIENTE'
                    CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'ENTREGADA',
                                      'DEVUELTA', 'DEVUELTA_INCOMPLETA')),
  docente_id        UUID NOT NULL REFERENCES public.docentes(id),
  token_aprobacion  TEXT NOT NULL UNIQUE DEFAULT uuid_generate_v4()::TEXT,
  codigo_entrega    TEXT,               -- 6 dígitos, se genera al aprobar
  observaciones     TEXT,               -- motivo de rechazo / notas de devolución
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Ítems de cada solicitud
CREATE TABLE IF NOT EXISTS public.items_solicitud (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  solicitud_id  UUID NOT NULL REFERENCES public.solicitudes(id) ON DELETE CASCADE,
  cantidad      INTEGER NOT NULL CHECK (cantidad > 0),
  descripcion   TEXT NOT NULL,
  estado_item   TEXT NOT NULL DEFAULT 'CUALQUIERA'
                CHECK (estado_item IN ('NUEVO', 'USADO', 'CUALQUIERA')),
  devuelto      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Plan de mantención de equipos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_mantencion (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo            TEXT NOT NULL,
  fecha             TEXT NOT NULL,
  version           TEXT NOT NULL,
  actualizado_segun TEXT,
  objetivo_general  TEXT,
  activo            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.secciones_mantencion (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID NOT NULL REFERENCES public.plan_mantencion(id) ON DELETE CASCADE,
  numero      INTEGER NOT NULL,
  nombre      TEXT NOT NULL,
  responsable TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.equipos (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seccion_id              UUID REFERENCES public.secciones_mantencion(id) ON DELETE CASCADE,
  numero_item             INTEGER NOT NULL,
  nombre                  TEXT NOT NULL,
  codigo_inventario       TEXT,
  nivel_uso               TEXT CHECK (nivel_uso IN ('USO MAYOR', 'USO MENOR')),
  nivel_costo             TEXT CHECK (nivel_costo IN ('COSTO MAYOR', 'COSTO MENOR')),
  frecuencia              TEXT DEFAULT 'ANUAL'
                          CHECK (frecuencia IN ('ANUAL', 'SEMESTRAL', 'MENSUAL', 'TRIMESTRAL')),
  mes_programado          TEXT,
  estado_programado       TEXT DEFAULT 'P' CHECK (estado_programado IN ('P', 'R', 'C')),
  cantidad                INTEGER,
  requiere_calibracion    BOOLEAN,
  tiene_informe_tecnico   BOOLEAN DEFAULT FALSE,
  tiene_cert_calibracion  BOOLEAN DEFAULT FALSE,
  activo                  BOOLEAN,
  observaciones           TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.actividades_planificacion (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES public.plan_mantencion(id) ON DELETE CASCADE,
  numero          INTEGER NOT NULL,
  actividad       TEXT NOT NULL,
  responsable     TEXT,
  frecuencia      TEXT,
  detalle_meses   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.registros_mantencion (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipo_id       UUID NOT NULL REFERENCES public.equipos(id) ON DELETE CASCADE,
  fecha_realizado DATE,
  tipo            TEXT CHECK (tipo IN ('PREVENTIVA', 'CORRECTIVA')),
  estado          TEXT DEFAULT 'P' CHECK (estado IN ('P', 'R', 'C')),
  tecnico         TEXT,
  observaciones   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notificaciones push ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.historial_notificaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  mensaje     TEXT NOT NULL,
  url         TEXT NOT NULL DEFAULT '/',
  leido       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ÍNDICES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_solicitudes_estado        ON public.solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_docente       ON public.solicitudes(docente_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_alumno_email  ON public.solicitudes(alumno_email);
CREATE INDEX IF NOT EXISTS idx_solicitudes_rut           ON public.solicitudes(rut);
CREATE INDEX IF NOT EXISTS idx_items_solicitud_id        ON public.items_solicitud(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_rol              ON public.perfiles(rol);
CREATE INDEX IF NOT EXISTS idx_perfiles_email            ON public.perfiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_equipos_seccion           ON public.equipos(seccion_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user   ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_historial_notif_user      ON public.historial_notificaciones(user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. FUNCIONES Y TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- updated_at automático
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS solicitudes_updated_at ON public.solicitudes;
CREATE TRIGGER solicitudes_updated_at BEFORE UPDATE ON public.solicitudes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS equipos_updated_at ON public.equipos;
CREATE TRIGGER equipos_updated_at BEFORE UPDATE ON public.equipos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Crea el perfil automáticamente al crear un usuario en Auth.
-- Los datos vienen de user_metadata (los pone el servidor / script de carga).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, rol, rut, jornada, seccion, carrera)
  VALUES (
    NEW.id,
    lower(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'ALUMNO'),
    NEW.raw_user_meta_data->>'rut',
    NEW.raw_user_meta_data->>'jornada',
    NEW.raw_user_meta_data->>'seccion',
    NEW.raw_user_meta_data->>'carrera'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Rol del usuario actual, leído desde perfiles (NO desde user_metadata, que el
-- propio usuario puede modificar). SECURITY DEFINER evita recursión en RLS.
CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid()
$$;

-- Guarda/actualiza la suscripción Web Push del dispositivo actual.
-- Si el endpoint ya existía con otro usuario (mismo navegador, otra cuenta), se reasigna.
CREATE OR REPLACE FUNCTION public.upsert_push_subscription(p_endpoint TEXT, p_p256dh TEXT, p_auth TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth)
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        p256dh  = EXCLUDED.p256dh,
        auth    = EXCLUDED.auth;
END;
$$;

-- Presencia: el panel del pañol la llama cada 30 s.
CREATE OR REPLACE FUNCTION public.registrar_presencia()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.perfiles SET last_seen = NOW()
  WHERE id = auth.uid() AND rol IN ('PANOL', 'ADMIN')
$$;

-- Personal del pañol conectado en los últimos 90 s (lo muestra el formulario del alumno).
CREATE OR REPLACE FUNCTION public.panoleros_activos()
RETURNS TABLE (nombre TEXT, rol TEXT) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nombre, rol FROM public.perfiles
  WHERE rol IN ('PANOL', 'ADMIN') AND last_seen > NOW() - INTERVAL '90 seconds'
$$;

-- "Olvidé mi contraseña": indica si el correo está registrado, sin exponer la tabla.
CREATE OR REPLACE FUNCTION public.email_registrado(p_email TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.perfiles WHERE lower(email) = lower(trim(p_email)))
$$;

REVOKE ALL ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.registrar_presencia()                     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.panoleros_activos()                       FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_presencia()                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.panoleros_activos()                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.email_registrado(TEXT)                     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rol_actual()                               TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY
--    Las rutas /api usan service_role (saltan RLS) y validan el rol en código
--    (src/lib/api-auth.ts). Estas políticas protegen las consultas que el
--    navegador hace directamente con la clave anon.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.perfiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docentes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaturas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items_solicitud           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_mantencion           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secciones_mantencion      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades_planificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_mantencion      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_notificaciones  ENABLE ROW LEVEL SECURITY;

-- ─── perfiles ──────────────────────────────────────────────────────────────
CREATE POLICY "perfiles_select" ON public.perfiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.rol_actual() IN ('ADMIN', 'PANOL'));
-- Sólo ADMIN modifica perfiles (incluido el cambio de rol). Nadie edita su propio rol.
CREATE POLICY "perfiles_admin_update" ON public.perfiles FOR UPDATE TO authenticated
  USING (public.rol_actual() = 'ADMIN') WITH CHECK (public.rol_actual() = 'ADMIN');

-- ─── docentes ──────────────────────────────────────────────────────────────
CREATE POLICY "docentes_select_activos" ON public.docentes FOR SELECT TO anon, authenticated
  USING (activo = TRUE OR public.rol_actual() IN ('ADMIN', 'PANOL'));
CREATE POLICY "docentes_write_staff" ON public.docentes FOR ALL TO authenticated
  USING (public.rol_actual() IN ('ADMIN', 'PANOL'))
  WITH CHECK (public.rol_actual() IN ('ADMIN', 'PANOL'));

-- ─── asignaturas ───────────────────────────────────────────────────────────
CREATE POLICY "asignaturas_select" ON public.asignaturas FOR SELECT TO anon, authenticated
  USING (TRUE);
CREATE POLICY "asignaturas_write_admin" ON public.asignaturas FOR ALL TO authenticated
  USING (public.rol_actual() = 'ADMIN') WITH CHECK (public.rol_actual() = 'ADMIN');

-- ─── solicitudes ───────────────────────────────────────────────────────────
-- Personal: todo · Docente: las asignadas (por id o email) · Alumno: las propias (email o RUT)
CREATE POLICY "solicitudes_select" ON public.solicitudes FOR SELECT TO authenticated
  USING (
    public.rol_actual() IN ('ADMIN', 'PANOL')
    OR docente_id IN (
      SELECT d.id FROM public.docentes d
      WHERE d.id = auth.uid() OR lower(d.email) = lower(auth.jwt() ->> 'email')
    )
    OR lower(alumno_email) = lower(auth.jwt() ->> 'email')
    OR rut = (SELECT p.rut FROM public.perfiles p WHERE p.id = auth.uid())
  );
CREATE POLICY "solicitudes_update_staff" ON public.solicitudes FOR UPDATE TO authenticated
  USING (public.rol_actual() IN ('ADMIN', 'PANOL'))
  WITH CHECK (public.rol_actual() IN ('ADMIN', 'PANOL'));
CREATE POLICY "solicitudes_delete_admin" ON public.solicitudes FOR DELETE TO authenticated
  USING (public.rol_actual() = 'ADMIN');
-- (Las solicitudes se crean desde POST /api/solicitudes con service_role.)

-- ─── items_solicitud: visibles si la solicitud padre es visible ────────────
CREATE POLICY "items_select" ON public.items_solicitud FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.solicitudes s WHERE s.id = solicitud_id));
CREATE POLICY "items_write_staff" ON public.items_solicitud FOR ALL TO authenticated
  USING (public.rol_actual() IN ('ADMIN', 'PANOL'))
  WITH CHECK (public.rol_actual() IN ('ADMIN', 'PANOL'));

-- ─── Plan de mantención: lectura pública (catálogo /equipos), escritura Admin/Pañol
CREATE POLICY "plan_select"       ON public.plan_mantencion FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "plan_write"        ON public.plan_mantencion FOR ALL TO authenticated
  USING (public.rol_actual() IN ('ADMIN', 'PANOL')) WITH CHECK (public.rol_actual() IN ('ADMIN', 'PANOL'));
CREATE POLICY "secciones_select"  ON public.secciones_mantencion FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "secciones_write"   ON public.secciones_mantencion FOR ALL TO authenticated
  USING (public.rol_actual() IN ('ADMIN', 'PANOL')) WITH CHECK (public.rol_actual() IN ('ADMIN', 'PANOL'));
CREATE POLICY "equipos_select"    ON public.equipos FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "equipos_write"     ON public.equipos FOR ALL TO authenticated
  USING (public.rol_actual() IN ('ADMIN', 'PANOL')) WITH CHECK (public.rol_actual() IN ('ADMIN', 'PANOL'));
CREATE POLICY "actividades_select" ON public.actividades_planificacion FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "actividades_write"  ON public.actividades_planificacion FOR ALL TO authenticated
  USING (public.rol_actual() IN ('ADMIN', 'PANOL')) WITH CHECK (public.rol_actual() IN ('ADMIN', 'PANOL'));
CREATE POLICY "registros_select"  ON public.registros_mantencion FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "registros_write"   ON public.registros_mantencion FOR ALL TO authenticated
  USING (public.rol_actual() IN ('ADMIN', 'PANOL')) WITH CHECK (public.rol_actual() IN ('ADMIN', 'PANOL'));

-- ─── Push y notificaciones: cada usuario sólo lo suyo ──────────────────────
CREATE POLICY "push_own" ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_select_own" ON public.historial_notificaciones FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.historial_notificaciones FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_delete_own" ON public.historial_notificaciones FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. VISTAS DE APOYO (para revisar datos desde el Table Editor)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.alumnos WITH (security_invoker = true) AS
  SELECT id, nombre, rut, email, jornada, seccion, carrera, created_at
  FROM public.perfiles WHERE rol = 'ALUMNO';
CREATE OR REPLACE VIEW public.alumnos_diurno WITH (security_invoker = true) AS
  SELECT id, nombre, rut, email, seccion, carrera, created_at
  FROM public.perfiles WHERE rol = 'ALUMNO' AND jornada = 'D';
CREATE OR REPLACE VIEW public.alumnos_vespertino WITH (security_invoker = true) AS
  SELECT id, nombre, rut, email, seccion, carrera, created_at
  FROM public.perfiles WHERE rol = 'ALUMNO' AND jornada = 'V';
CREATE OR REPLACE VIEW public.panoles WITH (security_invoker = true) AS
  SELECT id, nombre, rut, email, created_at
  FROM public.perfiles WHERE rol = 'PANOL';


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. REALTIME (el panel y la campana de notificaciones escuchan cambios)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitudes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.historial_notificaciones;

-- ✅ Listo. Siguiente paso: ejecutar supabase/seed.sql
