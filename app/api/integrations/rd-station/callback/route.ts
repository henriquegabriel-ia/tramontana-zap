import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, saveTokens } from '@/lib/rd-station'

const STATE_COOKIE = 'rd_oauth_state'
const RETURN_COOKIE = 'rd_oauth_return'

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const cookieState = request.cookies.get(STATE_COOKIE)?.value
    const returnTo = request.cookies.get(RETURN_COOKIE)?.value || '/settings'

    if (!code) {
      return NextResponse.json({ error: 'Codigo OAuth ausente' }, { status: 400 })
    }
    if (!state || !cookieState || state !== cookieState) {
      return NextResponse.json({ error: 'Estado OAuth invalido' }, { status: 400 })
    }

    // Troca o codigo de autorizacao por tokens de acesso
    const tokens = await exchangeCodeForTokens(code)
    await saveTokens(tokens)

    // Forcar path local — nunca permitir URLs absolutas (previne open redirect)
    const safePath = returnTo.startsWith('/') ? returnTo : '/settings'
    const separator = safePath.includes('?') ? '&' : '?'
    const absoluteReturnUrl = `${url.origin}${safePath}${separator}rd_connected=true`

    const response = NextResponse.redirect(absoluteReturnUrl)
    response.cookies.delete(STATE_COOKIE)
    response.cookies.delete(RETURN_COOKIE)
    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[rd-station] callback error:', errorMessage, error)
    return NextResponse.json({
      error: 'Falha ao concluir OAuth do RD Station',
      details: errorMessage,
    }, { status: 500 })
  }
}
