import { NextRequest, NextResponse } from 'next/server'
import { createDeal, getRDStationConfig } from '@/lib/rd-station'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { name, contactPhone, contactName, contactEmail } = body

    if (!name) {
      return NextResponse.json({ error: 'Nome do negócio é obrigatório' }, { status: 400 })
    }

    // Busca configuração do pipeline/stage
    const config = await getRDStationConfig()
    if (!config?.crmToken) {
      return NextResponse.json({ error: 'CRM do RD Station nao configurado' }, { status: 400 })
    }
    if (!config?.pipelineId) {
      return NextResponse.json({ error: 'Pipeline nao configurado' }, { status: 400 })
    }

    // Cria negocio no RD Station CRM
    const deal = await createDeal({
      name,
      contactPhone,
      contactName,
      contactEmail,
      pipelineId: config.pipelineId,
      stageId: config.stageId,
    })

    return NextResponse.json(deal)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[rd-station] deals error:', errorMessage, error)
    return NextResponse.json({ error: 'Falha ao criar negocio', details: errorMessage }, { status: 500 })
  }
}
