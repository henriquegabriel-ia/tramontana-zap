import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, saveTokens } from '@/lib/rd-station'
import { settingsDb } from '@/lib/supabase-db'

const SETTINGS_KEY = 'rd_station_oauth_state'
const STATE_MAX_AGE_MS = 10 * 60 * 1000 // 10 minutos

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code) {
      return NextResponse.json({ error: 'Código OAuth ausente' }, { status: 400 })
    }

    // Valida state via Supabase (mais confiável que cookies cross-site)
    const storedRaw = await settingsDb.get(SETTINGS_KEY)
    let storedState: string | null = null

    if (storedRaw) {
      try {
        const parsed = JSON.parse(storedRaw)
        const age = Date.now() - (parsed.createdAt || 0)
        if (age < STATE_MAX_AGE_MS) {
          storedState = parsed.state
        }
      } catch {
        // Se não for JSON, trata como state direto (fallback)
        storedState = storedRaw
      }
    }

    if (!state || !storedState || state !== storedState) {
      console.error('[RD Station] callback: state mismatch', {
        received: state?.substring(0, 10),
        stored: storedState?.substring(0, 10),
      })
      return NextResponse.json({ error: 'Estado OAuth inválido' }, { status: 400 })
    }

    // Limpa state usado
    await settingsDb.set(SETTINGS_KEY, '')

    // Troca o código de autorização por tokens de acesso
    const tokens = await exchangeCodeForTokens(code)
    await saveTokens(tokens)

    const absoluteReturnUrl = `${url.origin}/settings?rd_connected=true`
    return NextResponse.redirect(absoluteReturnUrl)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[RD Station] callback error:', errorMessage, error)
    return NextResponse.json({
      error: 'Falha ao concluir OAuth do RD Station',
      details: errorMessage,
    }, { status: 500 })
  }
}
