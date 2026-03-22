import { NextRequest, NextResponse } from 'next/server'
import { getRDStationConfig, type RDStageAction } from '@/lib/rd-station'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'

/**
 * Webhook do RD Station → Tramontana Zap
 *
 * Recebe eventos do RD Station e dispara ações no WhatsApp:
 * - crm_deal_updated: quando vendedor muda stage → envia template/texto pro contato
 * - crm_deal_created: quando negócio é criado → pode enviar boas-vindas
 * - WEBHOOK.CONVERTED: quando lead converte → pode enviar WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica header de autenticacao, se configurado
    const config = await getRDStationConfig()
    if (config?.webhookSecret) {
      const authHeader = request.headers.get('authorization')
      const expectedToken = `Bearer ${config.webhookSecret}`
      if (authHeader !== expectedToken) {
        console.warn('[RD Station] webhook: autenticação inválida')
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
    }

    const body = await request.json().catch(() => ({}))
    const eventType = body?.event_type || body?.event || 'unknown'

    console.log('[RD Station] webhook recebido:', {
      eventType,
      timestamp: new Date().toISOString(),
      payload: JSON.stringify(body).substring(0, 500),
    })

    // ── Processar eventos ────────────────────────────────────────────────

    if (eventType === 'crm_deal_updated') {
      // Deal mudou de stage → verificar se tem ação configurada
      const deal = body?.deal || {}
      const stageId = deal?.deal_stage?.id
      const stageName = deal?.deal_stage?.name
      const dealName = deal?.name
      const contacts = deal?.contacts || []

      console.log('[RD Station] deal atualizado:', {
        dealId: deal?.id,
        dealName,
        stageId,
        stageName,
        contactCount: contacts.length,
      })

      // Buscar ação configurada pra esse stage
      if (config?.stageActions?.length && stageId) {
        const action = config.stageActions.find(
          (a: RDStageAction) => a.stageId === stageId
        )

        if (action) {
          console.log('[RD Station] ação encontrada para stage:', {
            stageName,
            action: action.action,
            template: action.templateName,
          })

          // Extrair telefone dos contatos do deal
          for (const contact of contacts) {
            const phone = extractPhone(contact)
            if (!phone) {
              console.warn('[RD Station] contato sem telefone:', contact?.name)
              continue
            }

            try {
              if (action.action === 'send_template' && action.templateName) {
                const result = await sendWhatsAppMessage({
                  to: phone,
                  type: 'template',
                  templateName: action.templateName,
                })
                console.log('[RD Station] template enviado:', {
                  phone: maskPhone(phone),
                  template: action.templateName,
                  success: result.success,
                  messageId: result.messageId,
                })
              } else if (action.action === 'send_text' && action.textMessage) {
                // Substituir variáveis no texto
                const text = action.textMessage
                  .replace('{{nome}}', contact?.name || 'Cliente')
                  .replace('{{deal}}', dealName || '')
                  .replace('{{stage}}', stageName || '')

                const result = await sendWhatsAppMessage({
                  to: phone,
                  type: 'text',
                  text,
                })
                console.log('[RD Station] texto enviado:', {
                  phone: maskPhone(phone),
                  success: result.success,
                  messageId: result.messageId,
                })
              }
            } catch (err) {
              console.error('[RD Station] erro ao enviar WhatsApp:', {
                phone: maskPhone(phone),
                error: err instanceof Error ? err.message : String(err),
              })
            }
          }
        }
      }
    } else if (eventType === 'crm_deal_created') {
      console.log('[RD Station] negócio criado:', {
        dealId: body?.deal?.id,
        dealName: body?.deal?.name,
      })
    } else if (eventType === 'WEBHOOK.CONVERTED') {
      console.log('[RD Station] conversão de lead:', {
        email: body?.leads?.[0]?.email,
        conversionIdentifier: body?.leads?.[0]?.last_conversion?.content?.identificador,
      })
    } else {
      console.log('[RD Station] evento não mapeado:', eventType)
    }

    return NextResponse.json({ received: true, event: eventType })
  } catch (error) {
    console.error('[RD Station] webhook error:', error)
    return NextResponse.json({ received: true, error: 'Erro ao processar webhook' })
  }
}

/**
 * Extrai telefone de um contato do RD Station CRM.
 * Tenta phone.phone, phones[0].phone, ou mobile_phone.
 */
function extractPhone(contact: any): string | null {
  if (!contact) return null
  // Formato direto
  if (contact.phone) return String(contact.phone)
  // Formato com objeto phones
  if (contact.phones?.length) {
    const phone = contact.phones.find((p: any) => p.phone)
    if (phone) return String(phone.phone)
  }
  // Mobile phone
  if (contact.mobile_phone) return String(contact.mobile_phone)
  if (contact.personal_phone) return String(contact.personal_phone)
  return null
}

/** Mascara telefone para logs (mostra só últimos 4 dígitos) */
function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****'
  return '*'.repeat(phone.length - 4) + phone.slice(-4)
}
