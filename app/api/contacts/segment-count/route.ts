import { NextRequest, NextResponse } from 'next/server'
import { parsePhoneNumber } from 'libphonenumber-js'
import { supabase } from '@/lib/supabase'
import { getBrazilUfFromPhone } from '@/lib/br-geo'
import { normalizePhoneNumber } from '@/lib/phone-formatter'
import { requireSessionOrApiKey } from '@/lib/request-auth'

const parseList = (value: string | null): string[] => {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const resolveCountry = (phone: string): string | null => {
  const normalized = normalizePhoneNumber(String(phone || '').trim())
  if (!normalized) return null
  try {
    const parsed = parsePhoneNumber(normalized)
    return parsed?.country || null
  } catch {
    return null
  }
}

/**
 * GET /api/contacts/segment-count
 * Retorna contagem real de contatos com filtros por tags, pais (ISO) e UF (BR).
 * Filtro de tags aplicado no SQL (evita PostgREST 1000-row default limit).
 */
export async function GET(request: Request) {
  try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

    const url = new URL(request.url)
    const tags = parseList(url.searchParams.get('tags'))
    const countries = parseList(url.searchParams.get('countries'))
    const states = parseList(url.searchParams.get('states'))
    const combine = (url.searchParams.get('combine') || 'or').toLowerCase() === 'and' ? 'and' : 'or'

    const hasLocationFilters = countries.length > 0 || states.length > 0

    // Construir query base com filtro de tags no SQL
    // Usa operador JSONB cs (@>) do PostgreSQL.
    // Nota: && (ov) não funciona em colunas JSONB — apenas em arrays nativos (text[]).
    // Para OR: múltiplos @> combinados via .or()
    let query = supabase
      .from('contacts')
      .select('phone,tags', { count: 'exact' })

    // Validate tags to prevent PostgREST filter injection
    const safeTags = tags.filter(tag => /^[\w\s\-áàãâéêíóôõúüçÁÀÃÂÉÊÍÓÔÕÚÜÇ]+$/i.test(tag))

    if (safeTags.length > 0) {
      if (combine === 'and') {
        // @>: tags deve conter TODAS as tags especificadas (uma chamada com array completo)
        query = query.filter('tags', 'cs', JSON.stringify(safeTags))
      } else {
        // OR: cada tag gera um filtro @> separado, combinados via .or()
        const orConditions = safeTags
          .map((tag) => `tags.cs.${JSON.stringify([tag])}`)
          .join(',')
        query = query.or(orConditions)
      }
    }

    // Para filtros de localização, precisamos buscar os dados completos para
    // filtrar por país/UF (derivado do número de telefone, não disponível no SQL).
    // Limite alto para minimizar truncamento do PostgREST default (1000 linhas).
    // Limitação: datasets com >10000 contatos no segmento podem ter contagem imprecisa.
    if (hasLocationFilters) {
      query = query.limit(10000)
    }

    const { data, count: sqlCount, error } = await query

    if (error) throw error

    const contacts = data || []

    // Sem filtros de localização: count do SQL é preciso e sem limite de linhas
    if (!hasLocationFilters) {
      const matched = sqlCount ?? contacts.length
      return NextResponse.json({ total: matched, matched })
    }

    // Com filtros de localização: filtrar em memória sobre subconjunto filtrado por tag
    const total = sqlCount ?? contacts.length

    const matched = contacts.reduce((count, contact) => {
      const phone = String(contact.phone || '')
      const country = countries.length ? resolveCountry(phone) : null
      const uf = states.length ? getBrazilUfFromPhone(phone) : null

      const countryMatches = countries.map((code) => Boolean(country && country === code))
      const stateMatches = states.map((code) => Boolean(uf && uf === code))

      // Em modo OR com tags + localização, incluir match de tag no filtro in-memory.
      // O SQL já pré-filtrou por tag (OR), mas o reducer precisa saber se o contato
      // passou pela tag para contar corretamente no OR (tag OU localização).
      const tagMatches: boolean[] = []
      if (combine === 'or' && safeTags.length > 0) {
        const contactTags: string[] = Array.isArray((contact as any).tags) ? (contact as any).tags : []
        const hasTagMatch = safeTags.some((t) => contactTags.includes(t))
        tagMatches.push(hasTagMatch)
      }

      const filters = [...tagMatches, ...countryMatches, ...stateMatches]

      if (!filters.length) return count + 1
      const isMatch = combine === 'or' ? filters.some(Boolean) : filters.every(Boolean)
      return isMatch ? count + 1 : count
    }, 0)

    return NextResponse.json({ total, matched })
  } catch (error) {
    console.error('Failed to compute segment count:', error)
    return NextResponse.json(
      { error: 'Falha ao calcular contagem', details: (error as Error).message },
      { status: 500 }
    )
  }
}
