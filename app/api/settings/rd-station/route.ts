import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase'
import { settingsDb } from '@/lib/supabase-db'
import { getRDStationCredentialsPublic } from '@/lib/rd-station'

// Chaves no banco de settings
const KEY_CLIENT_ID = 'rdStationClientId'
const KEY_CLIENT_SECRET = 'rdStationClientSecret'
const KEY_CRM_TOKEN = 'rdStationCrmToken'
const KEY_PIPELINE_ID = 'rdStationPipelineId'
const KEY_STAGE_ID = 'rdStationStageId'
const KEY_AUTO_CREATE_DEAL = 'rdStationAutoCreateDeal'

export async function GET() {
  try {
    const config = await getRDStationCredentialsPublic()
    return NextResponse.json(config)
  } catch (error) {
    console.error('[rd-station] settings get error:', error)
    return NextResponse.json({ error: 'Falha ao carregar configuracoes do RD Station' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase nao configurado' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))

    // Salva credenciais OAuth (se fornecidas)
    if (body?.clientId !== undefined) {
      await settingsDb.set(KEY_CLIENT_ID, String(body.clientId || '').trim())
    }
    if (body?.clientSecret !== undefined) {
      await settingsDb.set(KEY_CLIENT_SECRET, String(body.clientSecret || '').trim())
    }

    // Salva token CRM (se fornecido)
    if (body?.crmToken !== undefined) {
      await settingsDb.set(KEY_CRM_TOKEN, String(body.crmToken || '').trim())
    }
    if (body?.pipelineId !== undefined) {
      await settingsDb.set(KEY_PIPELINE_ID, String(body.pipelineId || '').trim())
    }
    if (body?.stageId !== undefined) {
      await settingsDb.set(KEY_STAGE_ID, String(body.stageId || '').trim())
    }
    if (body?.autoCreateDeal !== undefined) {
      await settingsDb.set(KEY_AUTO_CREATE_DEAL, body.autoCreateDeal ? 'true' : 'false')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[rd-station] settings save error:', error)
    return NextResponse.json({ error: 'Falha ao salvar configuracoes do RD Station' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase nao configurado' }, { status: 400 })
    }

    // Limpa todas as configuracoes do RD Station
    await Promise.all([
      settingsDb.set(KEY_CLIENT_ID, ''),
      settingsDb.set(KEY_CLIENT_SECRET, ''),
      settingsDb.set(KEY_CRM_TOKEN, ''),
      settingsDb.set(KEY_PIPELINE_ID, ''),
      settingsDb.set(KEY_STAGE_ID, ''),
      settingsDb.set(KEY_AUTO_CREATE_DEAL, ''),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[rd-station] settings delete error:', error)
    return NextResponse.json({ error: 'Falha ao remover configuracoes do RD Station' }, { status: 500 })
  }
}
