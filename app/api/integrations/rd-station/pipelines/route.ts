import { NextResponse } from 'next/server'
import { listPipelines, getRDStationConfig } from '@/lib/rd-station'

export async function GET() {
  try {
    // Verifica se o CRM esta configurado antes de listar pipelines
    const config = await getRDStationConfig()
    if (!config?.crmToken) {
      return NextResponse.json({ error: 'CRM do RD Station nao configurado' }, { status: 400 })
    }

    const pipelines = await listPipelines()

    return NextResponse.json(pipelines)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[rd-station] pipelines error:', errorMessage, error)
    return NextResponse.json({ error: 'Falha ao listar pipelines', details: errorMessage }, { status: 500 })
  }
}
