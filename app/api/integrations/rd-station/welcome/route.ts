import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'
import { getRDStationConfig } from '@/lib/rd-station'
import { getSupabaseAdmin } from '@/lib/supabase'
import { normalizePhoneNumber } from '@/lib/phone-formatter'

const WELCOME_TEMPLATE = 'boas_vindas_tramontana'

interface RDLead {
  id?: string
  name?: string
  email?: string
  phone?: string
  mobile_phone?: string
  personal_phone?: string
  phones?: Array<{ phone?: string }>
}

export async function POST(request: NextRequest) {
  try {
    const config = await getRDStationConfig()
    if (config?.webhookSecret) {
      const authHeader = request.headers.get('authorization')
      const expectedToken = `Bearer ${config.webhookSecret}`
      if (authHeader !== expectedToken) {
        console.warn('[RD Welcome] autenticação inválida')
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
    }

    const body = await request.json().catch(() => ({}))
    const leads: RDLead[] = Array.isArray(body?.leads)
      ? body.leads
      : body?.leads
        ? [body.leads]
        : body?.id || body?.email || body?.mobile_phone
          ? [body as RDLead]
          : []

    if (leads.length === 0) {
      console.warn('[RD Welcome] payload sem leads:', JSON.stringify(body).substring(0, 300))
      return NextResponse.json({ received: true, sent: 0, reason: 'no leads in payload' })
    }

    let sentOk = 0
    let sentFail = 0
    const results: Array<{ email?: string; phone?: string; success: boolean; error?: string }> = []

    for (const lead of leads) {
      const phone = extractPhone(lead)
      const firstName = extractFirstName(lead)

      if (!phone) {
        console.warn('[RD Welcome] lead sem telefone:', { email: lead.email, name: lead.name })
        results.push({ email: lead.email, success: false, error: 'no phone' })
        sentFail++
        continue
      }

      try {
        const result = await sendWhatsAppMessage({
          to: phone,
          type: 'template',
          templateName: WELCOME_TEMPLATE,
          templateParams: { body: [firstName] },
        })

        console.log('[RD Welcome] template enviado:', {
          phone: maskPhone(phone),
          firstName,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        })

        if (result.success) {
          try {
            const db = getSupabaseAdmin()
            if (db) {
              const normalized = normalizePhoneNumber(phone) || phone
              const { error: insErr } = await db.from('welcome_dispatches').insert({
                phone: normalized,
                lead_email: lead.email || null,
                lead_name: lead.name || null,
                template_name: WELCOME_TEMPLATE,
                message_id: result.messageId || null,
              })
              if (insErr) {
                console.error('[RD Welcome] insert dispatch failed:', insErr.message)
              }
            }
          } catch (err) {
            console.error('[RD Welcome] insert dispatch exception:', err)
          }
        }

        results.push({
          email: lead.email,
          phone: maskPhone(phone),
          success: result.success,
          error: result.error,
        })

        if (result.success) sentOk++
        else sentFail++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[RD Welcome] erro ao enviar:', { phone: maskPhone(phone), error: message })
        results.push({ email: lead.email, phone: maskPhone(phone), success: false, error: message })
        sentFail++
      }
    }

    return NextResponse.json({
      received: true,
      total: leads.length,
      sent: sentOk,
      failed: sentFail,
      results,
    })
  } catch (error) {
    console.error('[RD Welcome] webhook error:', error)
    return NextResponse.json(
      { received: true, error: error instanceof Error ? error.message : 'Erro ao processar webhook' },
      { status: 200 }
    )
  }
}

function extractPhone(lead: RDLead): string | null {
  const candidate =
    lead.mobile_phone ||
    lead.personal_phone ||
    lead.phone ||
    lead.phones?.find((p) => p?.phone)?.phone

  if (!candidate) return null
  return String(candidate)
}

function extractFirstName(lead: RDLead): string {
  const full = String(lead.name || '').trim()
  if (!full) return 'Cliente'
  return full.split(/\s+/)[0]
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****'
  return '*'.repeat(phone.length - 4) + phone.slice(-4)
}
