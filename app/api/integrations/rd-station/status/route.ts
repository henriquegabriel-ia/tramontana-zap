import { NextResponse } from 'next/server'
import { getStoredTokens, getRDStationConfig } from '@/lib/rd-station'
import { isSupabaseConfigured } from '@/lib/supabase'

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        marketing: { connected: false },
        crm: { connected: false },
        error: 'Supabase nao configurado',
      }, { status: 400 })
    }

    const [tokens, config] = await Promise.all([
      getStoredTokens(),
      getRDStationConfig(),
    ])

    // Marketing API: conectado se possui tokens OAuth validos
    const marketingConnected = !!tokens?.accessToken

    // CRM: configurado se possui token de API do CRM
    const crmConnected = !!config?.crmToken
    const hasPipeline = !!config?.pipelineId

    return NextResponse.json({
      marketing: {
        connected: marketingConnected,
        expiresAt: tokens?.expiryDate || null,
      },
      crm: {
        connected: crmConnected,
        hasPipeline,
      },
    })
  } catch (error) {
    console.error('[rd-station] status error:', error)
    return NextResponse.json({
      marketing: { connected: false },
      crm: { connected: false },
      error: 'Falha ao consultar status',
    }, { status: 500 })
  }
}
