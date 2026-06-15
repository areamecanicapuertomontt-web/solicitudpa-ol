-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║   CREAR TABLA: correos_fallidos (Log & Alerta de Errores de Correo)       ║
-- ║   Pegar este SQL en: Supabase → SQL Editor → New Query → RUN              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.correos_fallidos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destinatario        TEXT NOT NULL,
  destinatario_nombre TEXT NOT NULL,
  asunto              TEXT NOT NULL,
  error_brevo         TEXT,
  error_resend        TEXT,
  fecha               TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.correos_fallidos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "Permitir lectura de correos fallidos a admins" ON public.correos_fallidos;
DROP POLICY IF EXISTS "Permitir borrar correos fallidos a admins" ON public.correos_fallidos;

-- Crear política de lectura para administradores y pañoleros
CREATE POLICY "Permitir lectura de correos fallidos a admins" ON public.correos_fallidos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol IN ('ADMIN', 'PANOL')
    )
  );

-- Crear política de borrado para administradores y pañoleros
CREATE POLICY "Permitir borrar correos fallidos a admins" ON public.correos_fallidos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol IN ('ADMIN', 'PANOL')
    )
  );
