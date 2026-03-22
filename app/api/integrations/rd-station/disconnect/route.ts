import { NextResponse } from 'next/server'
import { clearRDStationIntegration } from '@/lib/rd-station'
import { isSupabaseConfigured } from '@/lib/supabase'

export async function POST() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, error: 'Supabase nao configurado' }, { status: 400 })
    }

    await clearRDStationIntegration()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[rd-station] disconnect error:', error)
    return NextResponse.json({ ok: false, error: 'Falha ao desconectar RD Station' }, { status: 500 })
  }
}
