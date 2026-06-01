import { createServerClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { codigo } = body

    if (!codigo) {
      return Response.json({ error: 'Código de entrega requerido' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Buscar la solicitud y verificar código
    const { data: solicitud, error: fetchErr } = await supabase
      .from('solicitudes')
      .select('id, estado, codigo_entrega')
      .eq('id', id)
      .single()

    if (fetchErr || !solicitud) {
      return Response.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    if (solicitud.estado !== 'APROBADA') {
      return Response.json({ error: 'La solicitud no está aprobada' }, { status: 400 })
    }

    // Verificar código
    if (solicitud.codigo_entrega !== codigo.trim()) {
      return Response.json({ error: 'Código incorrecto. Revisa el correo del pañol.' }, { status: 400 })
    }

    // Marcar como entregada
    const { error: updateErr } = await supabase
      .from('solicitudes')
      .update({ estado: 'ENTREGADA' })
      .eq('id', id)

    if (updateErr) {
      return Response.json({ error: 'Error al actualizar' }, { status: 500 })
    }

    return Response.json({ ok: true, mensaje: 'Material entregado correctamente' })
  } catch (error) {
    console.error('Error en PATCH /api/panel/[id]/entregar:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
