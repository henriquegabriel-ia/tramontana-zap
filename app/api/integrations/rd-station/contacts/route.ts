import { NextRequest, NextResponse } from 'next/server'
import { createOrUpdateContact } from '@/lib/rd-station'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { phone, name, email, tags } = body

    if (!phone) {
      return NextResponse.json({ error: 'Telefone e obrigatorio' }, { status: 400 })
    }

    // Cria ou atualiza contato no RD Station Marketing
    const result = await createOrUpdateContact({ phone, name, email, tags })

    return NextResponse.json(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[rd-station] contacts error:', errorMessage, error)
    return NextResponse.json({ error: 'Falha ao criar/atualizar contato', details: errorMessage }, { status: 500 })
  }
}
