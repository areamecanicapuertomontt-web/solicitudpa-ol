// src/app/api/keepalive/route.ts
// Endpoint liviano para mantener Supabase activo en el plan gratuito.
// Es llamado cada 5 minutos por un cron job de GitHub Actions.
// Solo hace una consulta mínima (sin joins, sin auth) para despertar la BD.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge' // Edge runtime: arranque instantáneo, sin cold start propio

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ ok: false, error: 'Missing env vars' }, { status: 500 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Consulta mínima: solo pide 1 fila de una tabla pequeña para despertar la BD
    const { error } = await supabase
      .from('perfiles')
      .select('id')
      .limit(1)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      ts: new Date().toISOString(),
      msg: 'Supabase despierta ✅'
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
