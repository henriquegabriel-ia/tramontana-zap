import { NextRequest, NextResponse } from 'next/server'
import { createOAuthState, buildRDStationAuthUrl } from '@/lib/rd-station'
import { settingsDb } from '@/lib/supabase-db'

const SETTINGS_KEY = 'rd_station_oauth_state'

export async function GET(request: NextRequest) {
  try {
    const state = createOAuthState()
    const authUrl = await buildRDStationAuthUrl(state)

    // Salva state no Supabase (mais confiável que cookies em cross-site redirects)
    await settingsDb.set(SETTINGS_KEY, JSON.stringify({
      state,
      createdAt: Date.now(),
    }))

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[RD Station] connect error:', error)
    return NextResponse.json({ error: 'Falha ao iniciar OAuth do RD Station' }, { status: 500 })
  }
}
