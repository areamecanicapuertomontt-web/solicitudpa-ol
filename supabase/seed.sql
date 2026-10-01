-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  DATOS INICIALES — Sistema de Solicitudes de Pañol                       ║
-- ║  Ejecutar UNA sola vez, después de supabase/schema.sql                    ║
-- ║                                                                          ║
-- ║  Incluye: malla de asignaturas (IMI y MI) y el Plan de Mantención de     ║
-- ║  Equipos (61 registros). NO incluye usuarios ni datos personales:        ║
-- ║  los usuarios se cargan con scripts/cargar-usuarios.mjs                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ASIGNATURAS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.asignaturas (codigo, nombre, tipo, horas, requisitos, carrera, nivel) VALUES
  ('FGFC03', 'Formación Ciudadana', 'PRÁCTICA', 72, NULL, 'IMI', 1),
  ('MFA201', 'Mantenimiento Base Mecánico', 'PRÁCTICA', 90, NULL, 'IMI', 1),
  ('MFA204', 'Medición y Verificación', 'PRÁCTICA', 72, NULL, 'IMI', 1),
  ('MFA205', 'Lectura de Manuales e Interpretación de Planos', 'PRÁCTICA', 72, NULL, 'IMI', 1),
  ('MTAE02', 'Resolución de Problemas en Álgebra', 'LECTIVA', 90, NULL, 'IMI', 1),
  ('ATAN01', 'Administración', 'LECTIVA', 54, NULL, 'IMI', 2),
  ('MFA202', 'Electricidad Aplicada al Mantenimiento', 'PRÁCTICA', 72, NULL, 'IMI', 2),
  ('MFA302', 'Mantenimiento de Sistemas Hidráulicos y Neumáticos', 'PRÁCTICA', 72, NULL, 'IMI', 2),
  ('MFA303', 'Mantenimiento de Bombas', 'PRÁCTICA', 72, NULL, 'IMI', 2),
  ('MFA307', 'Materiales para Sistemas Mecánicos de Equipos Fijos', 'PRÁCTICA', 54, NULL, 'IMI', 2),
  ('MTFG01', 'Funciones y Geometría', 'LECTIVA', 90, 'MTAE02 - APR', 'IMI', 2),
  ('CBFM01', 'Física Mecánica', 'LECTIVA', 72, NULL, 'IMI', 3),
  ('FGEN01', 'Inglés I', 'LECTIVA', 72, NULL, 'IMI', 3),
  ('MFA301', 'Mantenimiento Sistemas de Transmisión', 'PRÁCTICA', 72, NULL, 'IMI', 3),
  ('MFA402', 'Mantenimiento de Sistemas Electrohidráulicos y Electroneumáticos', 'PRÁCTICA', 72, 'MFA302 - APR', 'IMI', 3),
  ('MFA404', 'Mantenimiento de Bombas Avanzado', 'PRÁCTICA', 72, 'MFA303 - APR', 'IMI', 3),
  ('MFE301', 'Electivo de Tendencias del Sector Productivo y de Servicios I', 'PRÁCTICA', 54, NULL, 'IMI', 3),
  ('FGIE01', 'Innovación y Emprendimiento I', 'PRÁCTICA', 72, NULL, 'IMI', 4),
  ('MFA401', 'Mantenimiento Sistemas de Transmisión Avanzado', 'PRÁCTICA', 54, 'MFA301 - APR', 'IMI', 4),
  ('MFB401', 'Técnicas de Ultrasonido y Termografía para el Mantenimiento', 'PRÁCTICA', 72, NULL, 'IMI', 4),
  ('MFB402', 'Análisis de Vibraciones en Máquinas y Equipos Industriales', 'PRÁCTICA', 72, NULL, 'IMI', 4),
  ('MFE401', 'Electivo de Tendencias del Sector Productivo y de Servicios II', 'PRÁCTICA', 54, NULL, 'IMI', 4),
  ('MFP401', 'Proyecto Integrado', 'PRÁCTICA', 54, 'MFA301 - APR<br/>MFA404 - APR', 'IMI', 4),
  ('CBCD01', 'Cálculo Diferencial', 'LECTIVA', 72, 'MTFG01 - APR', 'IMI', 5),
  ('CBET01', 'Estadística', 'LECTIVA', 72, 'MTAE02 - APR', 'IMI', 5),
  ('FGIE02', 'Innovación y Emprendimiento II', 'PRÁCTICA', 72, 'FGIE01 - APR', 'IMI', 5),
  ('MFC401', 'Coordinación del Mantenimiento', 'PRÁCTICA', 72, NULL, 'IMI', 5),
  ('MFC403', 'Gestión de Recursos para el Mantenimiento', 'PRÁCTICA', 54, NULL, 'IMI', 5),
  ('MFC404', 'Gestión de Resultados Operacionales', 'PRÁCTICA', 72, NULL, 'IMI', 5),
  ('ATFI01', 'Finanzas', 'LECTIVA', 72, NULL, 'IMI', 6),
  ('FGEN02', 'Inglés II', 'LECTIVA', 72, 'FGEN01 - APR', 'IMI', 6),
  ('MFB501', 'Gestión de Repuestos de Mantenimiento', 'PRÁCTICA', 72, NULL, 'IMI', 6),
  ('MFB502', 'Servicios de Mantenimiento de Equipos Fijos', 'PRÁCTICA', 72, NULL, 'IMI', 6),
  ('MFB503', 'Gestión de Riesgos del Área de Trabajo', 'PRÁCTICA', 54, NULL, 'IMI', 6),
  ('MFC402', 'Programación del Mantenimiento', 'PRÁCTICA', 72, NULL, 'IMI', 6),
  ('ATFP01', 'Formulación y Gestión de Proyectos', 'PRÁCTICA', 72, NULL, 'IMI', 7),
  ('ATGP01', 'Gestión de Personas', 'LECTIVA', 54, NULL, 'IMI', 7),
  ('FGEN03', 'Inglés III', 'LECTIVA', 72, 'FGEN02 - APR', 'IMI', 7),
  ('MFA405', 'Análisis de Materiales para Sistemas Mecánicos de Equipos Fijos', 'PRÁCTICA', 90, NULL, 'IMI', 7),
  ('MFA406', 'Termofluidos para Sistemas de Equipos Fijos', 'PRÁCTICA', 72, NULL, 'IMI', 7),
  ('MFE701', 'Electivo de Tendencias del Sector Productivo y de Servicios III', 'PRÁCTICA', 54, NULL, 'IMI', 7),
  ('FGIE03', 'Innovación y Emprendimiento III', 'PRÁCTICA', 72, 'FGIE02 - APR', 'IMI', 8),
  ('MFA501', 'Gestión de Mantenimiento y Confiabilidad Operacional', 'PRÁCTICA', 72, NULL, 'IMI', 8),
  ('MFA504', 'Análisis de Falla para Sistemas Mecánicos de Equipos Fijos', 'PRÁCTICA', 72, 'MFA405 - APR', 'IMI', 8),
  ('MFE801', 'Electivo de Tendencias del Sector Productivo y de Servicios IV', 'PRÁCTICA', 54, NULL, 'IMI', 8),
  ('MFE802', 'Electivo de Tendencias del Sector Productivo y de Servicios V', 'PRÁCTICA', 54, NULL, 'IMI', 8),
  ('MFP801', 'Proyecto de Título Profesional', 'PRÁCTICA', 54, 'ATFP01 - APR<br/>MFB502 - APR<br/>MFC402 - APR', 'IMI', 8),
  ('DCEA12', 'Electricidad Aplicada a Sistemas Móviles', 'PRÁCTICA', 72, NULL, 'MI', 1),
  ('DCMS11', 'Mecánica de Servicio Técnico', 'PRÁCTICA', 90, NULL, 'MI', 1),
  ('DCOT13', 'Organización del Taller Mecánico', 'LECTIVA', 54, NULL, 'MI', 1),
  ('FGFC01', 'Formación Ciudadana', 'PRÁCTICA', 90, NULL, 'MI', 1),
  ('MTAE01', 'Resolución de Problemas en Álgebra', 'LECTIVA', 108, NULL, 'MI', 1),
  ('ATAD01', 'Administración', 'LECTIVA', 72, NULL, 'MI', 2),
  ('GSPS24', 'Protocolos de Seguridad en Electromovilidad', 'PRÁCTICA', 54, NULL, 'MI', 2),
  ('MASA23', 'Seguridad Activa del Automóvil', 'PRÁCTICA', 54, NULL, 'MI', 2),
  ('MASE22', 'Sistemas Eléctricos del Automóvil', 'PRÁCTICA', 72, 'DCEA12 - APR', 'MI', 2),
  ('MASM21', 'Sistemas de Motorización', 'PRÁCTICA', 72, 'DCMS11 - APR', 'MI', 2),
  ('MTFG01', 'Funciones y Geometría', 'LECTIVA', 90, 'MTAE01 - APR', 'MI', 2),
  ('FGIN01', 'Inglés I', 'LECTIVA', 72, NULL, 'MI', 3),
  ('HIIA35', 'Integración Automotriz I', 'PRÁCTICA', 54, 'MASA23 - APR<br/>MASM21 - APR', 'MI', 3),
  ('MACR33', 'Conectividad y Redes del Automóvil', 'PRÁCTICA', 54, NULL, 'MI', 3),
  ('MAEA32', 'Sistemas Electrónicos del Automóvil', 'PRÁCTICA', 90, 'MASE22 - APR', 'MI', 3),
  ('MAET34', 'Electivo de Tendencias del Sector Productivo y de Servicios I', 'LECTIVA', 54, NULL, 'MI', 3),
  ('MAST31', 'Sistemas de Transmisión', 'PRÁCTICA', 90, 'DCMS11 - APR', 'MI', 3),
  ('FGIE01', 'Innovación y Emprendimiento I', 'PRÁCTICA', 72, NULL, 'MI', 4),
  ('HIIA45', 'Integración Automotriz II', 'PRÁCTICA', 54, 'MAEA32 - APR<br/>MAST31 - APR', 'MI', 4),
  ('MAET44', 'Electivo de Tendencias del Sector Productivo y de Servicios II', 'PRÁCTICA', 54, NULL, 'MI', 4),
  ('MAGE42', 'Gestión Electrónica del Motor', 'PRÁCTICA', 72, 'MAEA32 - APR', 'MI', 4),
  ('MASM43', 'Sistemas Multiplexados de Seguridad y Confortabilidad', 'PRÁCTICA', 72, 'MASE22 - APR', 'MI', 4),
  ('MASP41', 'Diagnóstico de Sistemas de Propulsión Intelligent', 'PRÁCTICA', 72, NULL, 'MI', 4),
  ('CBCD01', 'Cálculo Diferencial', 'LECTIVA', 72, 'MTFG01 - APR', 'MI', 5),
  ('CBFM01', 'Física Mecánica', 'LECTIVA', 72, NULL, 'MI', 5),
  ('FGIE02', 'Innovación y Emprendimiento II', 'PRÁCTICA', 72, 'FGIE01 - APR', 'MI', 5),
  ('GSMA53', 'Mantenibilidad Automotriz', 'LECTIVA', 54, NULL, 'MI', 5),
  ('MAMA51', 'Análisis de Materiales Automotrices', 'LECTIVA', 72, NULL, 'MI', 5),
  ('MATA52', 'Sistemas de Termofluidos del Automóvil', 'LECTIVA', 72, NULL, 'MI', 5),
  ('ATFN01', 'Finanzas', 'LECTIVA', 72, 'ATAD01 - APR', 'MI', 6),
  ('FGIN02', 'Inglés II', 'LECTIVA', 72, 'FGIN01 - APR', 'MI', 6),
  ('GSCA63', 'Confiabilidad Automotriz', 'LECTIVA', 72, NULL, 'MI', 6),
  ('HIIA65', 'Integración Automotriz III', 'PRÁCTICA', 54, 'GSMA53 - APR<br/>MATA52 - APR', 'MI', 6),
  ('MAFM61', 'Análisis de Fallas en Sistemas Mecánicos', 'LECTIVA', 72, 'MAMA51 - APR', 'MI', 6),
  ('MAFT62', 'Análisis de Fallas en Sistemas de Termofluidos', 'LECTIVA', 72, 'MATA52 - APR', 'MI', 6),
  ('ATEP01', 'Evaluación de Proyectos', 'PRÁCTICA', 72, 'ATFN01 - APR', 'MI', 7),
  ('FGIN03', 'Inglés III', 'LECTIVA', 72, 'FGIN02 - APR', 'MI', 7),
  ('GSAG71', 'Análisis de Garantía Automotriz', 'LECTIVA', 72, NULL, 'MI', 7),
  ('MAAA72', 'Análisis Técnico Avanzado en Sistemas Automotrices', 'LECTIVA', 90, NULL, 'MI', 7),
  ('MAET73', 'Electivo de Tendencias del Sector Productivo y de Servicios III', 'LECTIVA', 54, NULL, 'MI', 7),
  ('MAET74', 'Electivo de Tendencias del Sector Productivo y de Servicios IV', 'PRÁCTICA', 54, NULL, 'MI', 7),
  ('FGIE03', 'Innovación y Emprendimiento III', 'PRÁCTICA', 72, 'FGIE02 - APR', 'MI', 8),
  ('GSES82', 'Electromovilidad Sostenible', 'LECTIVA', 72, NULL, 'MI', 8),
  ('HIPA85', 'Proyecto Automotriz', 'LECTIVA', 72, 'ATEP01 - APR<br/>MAAA72 - APR', 'MI', 8),
  ('MAET83', 'Electivo de Tendencias del Sector Productivo y de Servicios V', 'LECTIVA', 54, NULL, 'MI', 8),
  ('MAET84', 'Electivo de Tendencias del Sector Productivo y de Servicios VI', 'PRÁCTICA', 54, NULL, 'MI', 8),
  ('MASA81', 'Soporte Automotriz Especializado', 'LECTIVA', 72, 'GSAG71 - APR<br/>MAFM61 - APR<br/>MAFT62 - APR', 'MI', 8)
ON CONFLICT (codigo, carrera) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  tipo = EXCLUDED.tipo,
  horas = EXCLUDED.horas,
  requisitos = EXCLUDED.requisitos,
  nivel = EXCLUDED.nivel;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. PLAN DE MANTENCIÓN DE EQUIPOS
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Insertar el Plan Maestro ─────────────────────────────────────────────
INSERT INTO public.plan_mantencion (id, titulo, fecha, version, actualizado_segun, objetivo_general)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'PLAN DE MANTENCIÓN DE EQUIPOS',
  'DICIEMBRE 2026',
  '01',
  'CIRCULAR DICIEMBRE 2025',
  'Implementar fichas de mantenimiento preventivo, cumpliendo el 100% de las actividades y realizando el 100% de las fichas de mantenimiento preventivo.'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Insertar Actividades de Planificación (Sección I) ───────────────────
INSERT INTO public.actividades_planificacion (numero, plan_id, actividad, responsable, frecuencia, detalle_meses)
VALUES
  (1, '11111111-1111-1111-1111-111111111111',
   'Reunión ordinaria',
   'Jefe de Talleres y Laboratorios', 'ANUAL',
   'Sep: P, Oct: P, Nov: P, Dic: P'),
  (2, '11111111-1111-1111-1111-111111111111',
   'Programa de trabajo de mantención preventivas',
   'Jefe de Talleres y Laboratorios', 'ANUAL',
   'Sep: 1'),
  (3, '11111111-1111-1111-1111-111111111111',
   'Programa de trabajo de mantención correctivas',
   'Jefe de Talleres y Laboratorios', 'ANUAL',
   'Ene: 0, Feb: 1, Mar: 1, Abr: 1, May: 1, Jun: 1, Jul: 1, Ago: 1, Sep: 1, Oct: 1'),
  (4, '11111111-1111-1111-1111-111111111111',
   'Evaluación avance programa',
   'Jefe de Talleres y Laboratorios', 'ANUAL',
   NULL)
ON CONFLICT DO NOTHING;

-- ─── Insertar Secciones ───────────────────────────────────────────────────
INSERT INTO public.secciones_mantencion (id, plan_id, numero, nombre, responsable)
VALUES
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   2, 'MECÁNICA Y ELECTROMOVILIDAD AUTOMOTRIZ', 'EXTERNO'),
  ('33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   3, 'MANTENIMIENTO INDUSTRIAL', 'EXTERNO')
ON CONFLICT (id) DO NOTHING;


-- ─── EQUIPOS: SECCIÓN II — MECÁNICA Y ELECTROMOVILIDAD AUTOMOTRIZ ─────────
--
--  N° | Equipo                                    | Cod.   | Uso       | Costo | Frec.  | Mes  | Cant | Calib | Inf | Cert | Activo
--  1  | PLUMA ELEVADORA                           | 6539   | MAYOR     | MENOR | ANUAL  | Jul  |  1   |  NO   |  -  |  -   |  SI
--  2  | VEHÍCULO AUTOMOTRIZ ELÉCTRICO             | -      | MAYOR     | MAYOR | ANUAL  | Jul  |  1   |  SI   |  -  |  -   |  SI
--  3  | BANCO PRUEBA ALTERNADOR/MOTOR ARRANQUE    | 6522   | MAYOR     | MAYOR | ANUAL  | Jul  |  1   |  SI   |  -  |  -   |  SI
--  4  | BANCO DINAMOMÉTRICO COMPACTO DTP          | -      | MAYOR     | MAYOR | ANUAL  | Jul  |  -   |  SI   |  -  |  -   |  SI
--  5  | BANCO ENTRENAMIENTO CONVERSIÓN ELÉCTRICO  | -      | MAYOR     | MAYOR | ANUAL  | Jul  |  1   |  SI   |  -  |  -   |  SI
--  6  | ANALIZADOR DE GASES                       | 120714 | MAYOR     | MAYOR | ANUAL  | Jul  |  1   |  SI   |  SI |  -   |  SI
--  7  | OPACÍMETRO                                | -      | MAYOR     | MAYOR | ANUAL  | Jul  |  1   |  NO   |  -  |  -   |  SI
--  8  | ELEVADOR                                  | 121182 | MAYOR     | MAYOR | ANUAL  | Jul  |  1   |  NO   |  SI |  -   |  SI
--  9  | MOTOR GASOLINA 4 TIEMPOS                  | -      | MAYOR     | MAYOR | ANUAL  | Sep  |  1   |  NO   |  -  |  -   |  NO
-- 10  | MAQUETA MOTOR C/EMBRAGUE Y TRANSMISIÓN    | -      | MAYOR     | MAYOR | ANUAL  | Jul  |  -   |  -    |  -  |  -   |  -
-- 11  | ELEVADOR PARA MOTOCICLETA                 | 148506 | MENOR     | MENOR | ANUAL  | Jul  |  1   |  SI   |  -  |  -   |  SI
-- 12  | MOTOCICLETA                               | 163525 | MENOR     | MAYOR | ANUAL  | Jul  |  1   |  SI   |  -  |  -   |  SI

INSERT INTO public.equipos
  (numero_item, nombre, codigo_inventario, seccion_id,
   nivel_uso, nivel_costo, frecuencia, mes_programado, estado_programado,
   cantidad, requiere_calibracion, tiene_informe_tecnico, tiene_cert_calibracion, activo)
VALUES
  ( 1, 'PLUMA ELEVADORA',
       '6539',   '22222222-2222-2222-2222-222222222222',
       'USO MAYOR', 'COSTO MENOR', 'ANUAL', 'Julio',      'P',  1, FALSE, FALSE, FALSE, TRUE),
  ( 2, 'VEHÍCULO AUTOMOTRIZ ELÉCTRICO',
       NULL,    '22222222-2222-2222-2222-222222222222',
       'USO MAYOR', 'COSTO MAYOR', 'ANUAL', 'Julio',      'P',  1, TRUE,  FALSE, FALSE, TRUE),
  ( 3, 'BANCO DE PRUEBA PARA ALTERNADOR Y MOTOR DE ARRANQUE',
       '6522',  '22222222-2222-2222-2222-222222222222',
       'USO MAYOR', 'COSTO MAYOR', 'ANUAL', 'Julio',      'P',  1, TRUE,  FALSE, FALSE, TRUE),
  ( 4, 'BANCO DINAMOMÉTRICO COMPACTO DTP',
       NULL,    '22222222-2222-2222-2222-222222222222',
       'USO MAYOR', 'COSTO MAYOR', 'ANUAL', 'Julio',      'P',  NULL, TRUE, FALSE, FALSE, TRUE),
  ( 5, 'BANCO DE ENTRENAMIENTO CONVERSIÓN VEHÍCULO ELÉCTRICO',
       NULL,    '22222222-2222-2222-2222-222222222222',
       'USO MAYOR', 'COSTO MAYOR', 'ANUAL', 'Julio',      'P',  1, TRUE,  FALSE, FALSE, TRUE),
  ( 6, 'ANALIZADOR DE GASES',
       '120714','22222222-2222-2222-2222-222222222222',
       'USO MAYOR', 'COSTO MAYOR', 'ANUAL', 'Julio',      'P',  1, TRUE,  TRUE,  FALSE, TRUE),
  ( 7, 'OPACÍMETRO',
       NULL,    '22222222-2222-2222-2222-222222222222',
       'USO MAYOR', 'COSTO MAYOR', 'ANUAL', 'Julio',      'P',  1, FALSE, FALSE, FALSE, TRUE),
  ( 8, 'ELEVADOR',
       '121182','22222222-2222-2222-2222-222222222222',
       'USO MAYOR', 'COSTO MAYOR', 'ANUAL', 'Julio',      'P',  1, FALSE, TRUE,  FALSE, TRUE),
  ( 9, 'MOTOR GASOLINA 4 TIEMPOS',
       NULL,    '22222222-2222-2222-2222-222222222222',
       'USO MAYOR', 'COSTO MAYOR', 'ANUAL', 'Septiembre', 'P',  1, FALSE, FALSE, FALSE, FALSE),
  (10, 'MAQUETA DE MOTOR CON SISTEMA DE EMBRAGUE Y TRANSMISIÓN MECÁNICA PILOTADA INCORPORADAS',
       NULL,    '22222222-2222-2222-2222-222222222222',
       'USO MAYOR', 'COSTO MAYOR', 'ANUAL', 'Julio',      'P',  NULL, NULL, FALSE, FALSE, NULL),
  (11, 'ELEVADOR PARA MOTOCICLETA',
       '148506','22222222-2222-2222-2222-222222222222',
       'USO MENOR', 'COSTO MENOR', 'ANUAL', 'Julio',      'P',  1, TRUE,  FALSE, FALSE, TRUE),
  (12, 'MOTOCICLETA',
       '163525','22222222-2222-2222-2222-222222222222',
       'USO MENOR', 'COSTO MAYOR', 'ANUAL', 'Julio',      'P',  1, TRUE,  FALSE, FALSE, TRUE);


-- ─── EQUIPOS: SECCIÓN III — MANTENIMIENTO INDUSTRIAL ─────────────────────
--
--  N° | Equipo                                     | Cód.   | Uso   | Costo | Frec.    | Mes | Cant | Calib | Inf | Cert | Activo
--   1  | BANCO ENTRENAMIENTO NEUMÁTICO/PLC         | 121181 | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--   2  | BANCO ELECTROHIDRÁULICO                   | 116077 | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--   3  | BANCO ELECTROHIDRÁULICO                   | 121182 | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--   4  | BANCO ELECTROHIDRÁULICO                   | 2320   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--   5  | BANCO ELECTROHIDRÁULICO                   | 6650   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--   6  | BANCO ELECTROHIDRÁULICO                   | 3841   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--   7  | BANCO INTEGRAL DE MOTORES                 | 121138 | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--   8  | BANCO MONTAJE/EXTRAC. RODAMIENTOS         | 121136 | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--   9  | BANCO MONTAJE/EXTRAC. RODAMIENTOS         | 116258 | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  10  | BOMBA CENTRÍFUGA+BASE+MOTOR               | 158847 | MAY   | MEN   | ANUAL    | Jul |  1   |  SI   |  -  |  -   |  SI
--  11  | BOMBA CENTRÍFUGA+BASE+MOTOR               | 158848 | MAY   | MEN   | ANUAL    | Jul |  1   |  SI   |  -  |  -   |  SI
--  12  | CÁMARA TERMOGRÁFICA                       | 120510 | MEN   | MAY   | ANUAL    | Ago |  1   |  SI   |  -  |  -   |  SI
--  13  | CÁMARA TERMOGRÁFICA                       | 62139  | MEN   | MAY   | ANUAL    | Ago |  1   |  SI   |  -  |  -   |  SI
--  14  | DETECTOR FALLAS ULTRASONIDO               | 71868  | MEN   | MAY   | ANUAL    | Ago |  1   |  SI   |  -  |  -   |  SI
--  15  | EQUIPO ANALIZADOR DE VIBRACIONES          | 107420 | MEN   | MAY   | ANUAL    | Jul |  1   |  SI   |  SI |  -   |  SI
--  16  | EQUIPO ANALIZADOR DE VIBRACIONES          | 120511 | MEN   | MAY   | ANUAL    | Jul |  1   |  SI   |  -  |  -   |  -
--  17  | MAQUETA DE ENTRENAMIENTO                  | 133435 | MAY   | MAY   | ANUAL    | Jul |  -   |  -    |  -  |  -   |  -
--  18  | MEDIDOR DE AISLACIÓN ANALÓGICO            | 121258 | MAY   | MAY   | ANUAL    | Jul |  -   |  SI   |  -  |  -   |  SI
--  19  | MEDIDOR DE VIBRACIONES                    | 107382 | MEN   | MAY   | ANUAL    | Jul |  1   |  SI   |  SI |  -   |  SI
--  20  | MEDIDOR DE VIBRACIONES                    | 120514 | MEN   | MAY   | ANUAL    | Jul |  1   |  SI   |  SI |  -   |  SI
--  21  | MOTOR TRIFÁSICO JAULA DE ARDILLA          | 107653 | MAY   | MEN   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  22  | MOTOR TRIFÁSICO JAULA DE ARDILLA          | 107654 | MAY   | MEN   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  23  | MOTOR TRIFÁSICO ROTOR BOBINADO            | -      |  -    |  -    | ANUAL    | Jul |  -   |  -    |  -  |  -   |  -
--  24  | SET COMPONENTES OLEO HIDR. Y NEUMÁTICOS   | -      |  -    |  -    | ANUAL    | Jul |  -   |  -    |  -  |  -   |  -
--  25  | SET DE CONTROL DE PROCESOS                | 4799   |  -    |  -    | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  25  | SET DE CONTROL DE PROCESOS                | 4800   |  -    |  -    | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  25  | SET DE CONTROL DE PROCESOS                | 6619   |  -    |  -    | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  25  | SET DE CONTROL DE PROCESOS                | 6620   |  -    |  -    | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  26  | SET PLC                                   | 121145 | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  27  | SET PLC                                   | 140297 | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  28  | SET PLC                                   | 2315   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  29  | SET PLC                                   | 129512 | MAY   | MAY   | SEMESTRAL| Jul |  1   |  NO   |  -  |  -   |  SI
--  30  | SET PLC                                   | 6559   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  31  | SET PLC                                   | 6560   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  32  | SET PLC                                   | 6558   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  33  | SET PLC                                   | 6561   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  34  | SET PLC                                   | 2316   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  35  | SET PLC                                   | 6563   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  36  | SET PLC                                   | 6562   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  37  | SET PLC                                   | 2313   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  -
--  38  | SISTEMA LÁSER ALINEADOR DE POLEAS         | 72205  | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  39  | SISTEMA LÁSER ALINEADOR DE EJES           | 192839 | MEN   | MAY   | ANUAL    | Jul |  1   |  SI   |  -  |  -   |  SI
--  40  | SOLDADORA AL ARCO                         | 8159   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  41  | SOLDADORA AL ARCO                         | 149841 | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  42  | SOLDADORA AL ARCO                         | 439991 | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  43  | SOLDADORA AL ARCO                         | 8165   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  44  | SOLDADORA AL ARCO                         | 116216 | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  45  | SOLDADORA AL ARCO                         | 8164   | MAY   | MAY   | ANUAL    | Jul |  1   |  NO   |  -  |  -   |  SI
--  46  | TALADRO DE COLUMNA                        | 4628   | MEN   | MAY   | ANUAL    | Jul |  1   |  SI   |  -  |  -   |  SI

INSERT INTO public.equipos
  (numero_item, nombre, codigo_inventario, seccion_id,
   nivel_uso, nivel_costo, frecuencia, mes_programado, estado_programado,
   cantidad, requiere_calibracion, tiene_informe_tecnico, tiene_cert_calibracion, activo)
VALUES
  -- Bancos
  ( 1, 'BANCO DE ENTRENAMIENTO NEUMÁTICO/PLC',           '121181','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  ( 2, 'BANCO ELECTROHIDRÁULICO',                        '116077','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  ( 3, 'BANCO ELECTROHIDRÁULICO',                        '121182','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  ( 4, 'BANCO ELECTROHIDRÁULICO',                        '2320',  '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  ( 5, 'BANCO ELECTROHIDRÁULICO',                        '6650',  '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  ( 6, 'BANCO ELECTROHIDRÁULICO',                        '3841',  '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  ( 7, 'BANCO INTEGRAL DE MOTORES',                      '121138','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  ( 8, 'BANCO PARA MONTAJE Y EXTRACCIÓN DE RODAMIENTOS', '121136','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  ( 9, 'BANCO PARA MONTAJE Y EXTRACCIÓN DE RODAMIENTOS', '116258','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  -- Bombas
  (10, 'BOMBA CENTRÍFUGA+BASE+MOTOR',                    '158847','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MENOR','ANUAL','Julio','P', 1, TRUE, FALSE,FALSE,TRUE),
  (11, 'BOMBA CENTRÍFUGA+BASE+MOTOR',                    '158848','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MENOR','ANUAL','Julio','P', 1, TRUE, FALSE,FALSE,TRUE),
  -- Cámaras
  (12, 'CÁMARA TERMOGRÁFICA',                            '120510','33333333-3333-3333-3333-333333333333',
       'USO MENOR','COSTO MAYOR','ANUAL','Agosto','P', 1, TRUE, FALSE,FALSE,TRUE),
  (13, 'CÁMARA TERMOGRÁFICA',                            '62139', '33333333-3333-3333-3333-333333333333',
       'USO MENOR','COSTO MAYOR','ANUAL','Agosto','P', 1, TRUE, FALSE,FALSE,TRUE),
  -- Detector ultrasonido
  (14, 'DETECTOR DE FALLAS POR ULTRASONIDO',             '71868', '33333333-3333-3333-3333-333333333333',
       'USO MENOR','COSTO MAYOR','ANUAL','Agosto','P', 1, TRUE, FALSE,FALSE,TRUE),
  -- Analizadores de vibraciones
  (15, 'EQUIPO ANALIZADOR DE VIBRACIONES',               '107420','33333333-3333-3333-3333-333333333333',
       'USO MENOR','COSTO MAYOR','ANUAL','Julio','P', 1, TRUE, TRUE, FALSE,TRUE),
  (16, 'EQUIPO ANALIZADOR DE VIBRACIONES',               '120511','33333333-3333-3333-3333-333333333333',
       'USO MENOR','COSTO MAYOR','ANUAL','Julio','P', 1, TRUE, FALSE,FALSE,NULL),
  -- Maqueta
  (17, 'MAQUETA DE ENTRENAMIENTO',                       '133435','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', NULL, NULL,FALSE,FALSE,NULL),
  -- Medidores
  (18, 'MEDIDOR DE AISLACIÓN ANALÓGICO',                 '121258','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', NULL,TRUE, FALSE,FALSE,TRUE),
  (19, 'MEDIDOR DE VIBRACIONES',                         '107382','33333333-3333-3333-3333-333333333333',
       'USO MENOR','COSTO MAYOR','ANUAL','Julio','P', 1, TRUE, TRUE, FALSE,TRUE),
  (20, 'MEDIDOR DE VIBRACIONES',                         '120514','33333333-3333-3333-3333-333333333333',
       'USO MENOR','COSTO MAYOR','ANUAL','Julio','P', 1, TRUE, TRUE, FALSE,TRUE),
  -- Motores
  (21, 'MOTOR TRIFÁSICO JAULA DE ARDILLA',               '107653','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MENOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (22, 'MOTOR TRIFÁSICO JAULA DE ARDILLA',               '107654','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MENOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (23, 'MOTOR TRIFÁSICO ROTOR BOBINADO',                 NULL,    '33333333-3333-3333-3333-333333333333',
       NULL, NULL,'ANUAL','Julio','P', NULL,NULL,FALSE,FALSE,NULL),
  -- Sets
  (24, 'SET DE COMPONENTES OLEO HIDRÁULICOS Y NEUMÁTICOS',NULL,  '33333333-3333-3333-3333-333333333333',
       NULL, NULL,'ANUAL','Julio','P', NULL,NULL,FALSE,FALSE,NULL),
  (25, 'SET DE CONTROL DE PROCESOS',                     '4799', '33333333-3333-3333-3333-333333333333',
       NULL, NULL,'ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (25, 'SET DE CONTROL DE PROCESOS',                     '4800', '33333333-3333-3333-3333-333333333333',
       NULL, NULL,'ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (25, 'SET DE CONTROL DE PROCESOS',                     '6619', '33333333-3333-3333-3333-333333333333',
       NULL, NULL,'ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (25, 'SET DE CONTROL DE PROCESOS',                     '6620', '33333333-3333-3333-3333-333333333333',
       NULL, NULL,'ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  -- PLCs
  (26, 'SET DE CONTROLADORES LÓGICOS PROGRAMABLES PLC',  '121145','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (27, 'SET DE CONTROLADORES LÓGICOS PROGRAMABLES PLC',  '140297','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (28, 'SET DE CONTROLADORES LÓGICOS PROGRAMABLES PLC',  '2315', '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (29, 'SET DE CONTROLADORES LÓGICOS PROGRAMABLES PLC',  '129512','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','SEMESTRAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (30, 'SET DE CONTROLADORES LÓGICOS PROGRAMABLES PLC',  '6559', '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (31, 'SET DE CONTROLADORES LÓGICOS PROGRAMABLES PLC',  '6560', '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (32, 'SET DE CONTROLADORES LÓGICOS PROGRAMABLES PLC',  '6558', '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (33, 'SET DE CONTROLADORES LÓGICOS PROGRAMABLES PLC',  '6561', '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (34, 'SET DE CONTROLADORES LÓGICOS PROGRAMABLES PLC',  '2316', '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (35, 'SET DE CONTROLADORES LÓGICOS PROGRAMABLES PLC',  '6563', '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (36, 'SET DE CONTROLADORES LÓGICOS PROGRAMABLES PLC',  '6562', '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (37, 'SET DE CONTROLADORES LÓGICOS PROGRAMABLES PLC',  '2313', '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,NULL),
  -- Sistemas láser
  (38, 'SISTEMA LÁSER ALINEADOR DE POLEAS',              '72205', '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (39, 'SISTEMA LÁSER ALINEADOR DE EJES',                '192839','33333333-3333-3333-3333-333333333333',
       'USO MENOR','COSTO MAYOR','ANUAL','Julio','P', 1, TRUE, FALSE,FALSE,TRUE),
  -- Soldadoras al arco
  (40, 'SOLDADORA AL ARCO',                              '8159',  '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (41, 'SOLDADORA AL ARCO',                              '149841','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (42, 'SOLDADORA AL ARCO',                              '439991','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (43, 'SOLDADORA AL ARCO',                              '8165',  '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (44, 'SOLDADORA AL ARCO',                              '116216','33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  (45, 'SOLDADORA AL ARCO',                              '8164',  '33333333-3333-3333-3333-333333333333',
       'USO MAYOR','COSTO MAYOR','ANUAL','Julio','P', 1, FALSE,FALSE,FALSE,TRUE),
  -- Taladro
  (46, 'TALADRO DE COLUMNA',                             '4628',  '33333333-3333-3333-3333-333333333333',
       'USO MENOR','COSTO MAYOR','ANUAL','Julio','P', 1, TRUE, FALSE,FALSE,TRUE);
