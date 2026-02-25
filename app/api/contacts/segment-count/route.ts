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
    // Usa operadores JSONB nativos do PostgreSQL:
    //   cs (@>) = contains (AND: contém TODAS as tags)
    //   ov (&&) = overlap  (OR:  contém QUALQUER tag)
    let query = supabase
      .from('contacts')
      .select('phone,tags', { count: 'exact' })

    if (tags.length > 0) {
      if (combine === 'and') {
        // @>: tags deve conter TODAS as tags especificadas (uma chamada, não loop)
        query = query.filter('tags', 'cs', JSON.stringify(tags))
      } else {
        // &&: tags deve conter pelo menos UMA das tags especificadas
        query = query.filter('tags', 'ov', JSON.stringify(tags))
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
      const filters = [...countryMatches, ...stateMatches]

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
