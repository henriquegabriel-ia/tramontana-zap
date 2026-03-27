import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase'
import { settingsDb } from '@/lib/supabase-db'
import {
  getRDStationCredentialsPublic,
  getRDStationConfig,
  saveRDStationConfig,
  type RDStationConfig,
} from '@/lib/rd-station'

// Chaves OAuth (separadas do config CRM)
const KEY_CLIENT_ID = 'rdStationClientId'
const KEY_CLIENT_SECRET = 'rdStationClientSecret'

export async function GET() {
  try {
    const [credentialsPublic, config] = await Promise.all([
      getRDStationCredentialsPublic(),
      getRDStationConfig(),
    ])
    return NextResponse.json({
      ...credentialsPublic,
      crmConnected: !!config?.crmToken,
      hasPipeline: !!config?.pipelineId,
      pipelineId: config?.pipelineId || null,
      stageId: config?.stageId || null,
      autoCreateDeal: config?.autoCreateDeal || false,
    })
  } catch (error) {
    console.error('[RD Station] settings get error:', error)
    return NextResponse.json({ error: 'Falha ao carregar configurações do RD Station' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))

    // Salva credenciais OAuth (se fornecidas)
    if (body?.clientId !== undefined) {
      await settingsDb.set(KEY_CLIENT_ID, String(body.clientId || '').trim())
    }
    if (body?.clientSecret !== undefined) {
      await settingsDb.set(KEY_CLIENT_SECRET, String(body.clientSecret || '').trim())
    }

    // Salva config CRM como JSON unificado (é assim que getRDStationConfig() lê)
    const hasCrmFields = body?.crmToken !== undefined
      || body?.pipelineId !== undefined
      || body?.stageId !== undefined
      || body?.autoCreateDeal !== undefined
      || body?.stageActions !== undefined
      || body?.webhookSecret !== undefined

    if (hasCrmFields) {
      // Carrega config existente pra fazer merge
      const existing = await getRDStationConfig()
      const merged: RDStationConfig = {
        crmToken: existing?.crmToken || '',
        pipelineId: existing?.pipelineId,
        stageId: existing?.stageId,
        autoCreateDeal: existing?.autoCreateDeal || false,
        stageActions: existing?.stageActions,
        webhookSecret: existing?.webhookSecret,
      }

      // Aplica campos fornecidos
      if (body?.crmToken !== undefined) merged.crmToken = String(body.crmToken || '').trim()
      if (body?.pipelineId !== undefined) merged.pipelineId = String(body.pipelineId || '').trim()
      if (body?.stageId !== undefined) merged.stageId = String(body.stageId || '').trim()
      if (body?.autoCreateDeal !== undefined) merged.autoCreateDeal = !!body.autoCreateDeal
      if (body?.stageActions !== undefined) merged.stageActions = body.stageActions
      if (body?.webhookSecret !== undefined) merged.webhookSecret = String(body.webhookSecret || '').trim()

      await saveRDStationConfig(merged)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[RD Station] settings save error:', error)
    return NextResponse.json({ error: 'Falha ao salvar configurações do RD Station' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 400 })
    }

    // Limpa todas as configurações do RD Station
    await Promise.all([
      settingsDb.set(KEY_CLIENT_ID, ''),
      settingsDb.set(KEY_CLIENT_SECRET, ''),
      settingsDb.set('rd_station_config', ''),
      settingsDb.set('rd_station_tokens', ''),
      settingsDb.set('rd_station_oauth_state', ''),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[RD Station] settings delete error:', error)
    return NextResponse.json({ error: 'Falha ao remover configurações do RD Station' }, { status: 500 })
  }
}
