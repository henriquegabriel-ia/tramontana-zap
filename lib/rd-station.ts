import { settingsDb } from '@/lib/supabase-db'
import { isSupabaseConfigured } from '@/lib/supabase'

// ── Constantes ──────────────────────────────────────────────────────────────

const SETTINGS_KEYS = {
  tokens: 'rd_station_tokens',
  config: 'rd_station_config',
  clientId: 'rdStationClientId',
  clientSecret: 'rdStationClientSecret',
} as const

const RD_MARKETING_BASE = 'https://api.rd.services'
const RD_CRM_BASE = 'https://crm.rdstation.com/api/v1'

const FETCH_TIMEOUT_MS = 15_000

// ── Types ───────────────────────────────────────────────────────────────────

export interface RDStationTokens {
  accessToken: string
  refreshToken: string
  expiryDate: number
}

/**
 * Mapeamento de stage do RD Station → ação no WhatsApp.
 * Quando um deal muda pra esse stage, dispara a mensagem configurada.
 */
export interface RDStageAction {
  stageId: string
  stageName?: string
  action: 'send_template' | 'send_text'
  /** Nome do template aprovado na Meta (se action = send_template) */
  templateName?: string
  /** Texto livre (se action = send_text) */
  textMessage?: string
}

export interface RDStationConfig {
  crmToken: string
  pipelineId?: string
  stageId?: string
  /** @deprecated Use pipelineId */
  defaultPipelineId?: string
  /** @deprecated Use stageId */
  defaultStageId?: string
  autoCreateDeal: boolean
  webhookSecret?: string
  /** Mapeamento de stages → ações WhatsApp (fluxo RD → WhatsApp) */
  stageActions?: RDStageAction[]
}

export type RDStationCredentialsSource = 'db' | 'env' | 'none'

export type RDStationCredentialsPublic = {
  clientId: string | null
  source: RDStationCredentialsSource
  hasClientSecret: boolean
  isConfigured: boolean
}

export interface RDStationCredentials {
  clientId: string
  clientSecret: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Retorna a URL base da aplicação, considerando Vercel e variáveis de ambiente.
 */
export function getBaseUrl(): string {
  const vercelEnv = process.env.VERCEL_ENV || null
  if (vercelEnv === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.trim()}`
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.trim()
  }
  return 'http://localhost:3000'
}

/**
 * Retorna a URI de redirect para o callback OAuth do RD Station.
 */
export function getRDStationRedirectUri(): string {
  return process.env.RD_STATION_REDIRECT_URI || `${getBaseUrl()}/api/integrations/rd-station/callback`
}

/**
 * Gera um state aleatório para o fluxo OAuth.
 */
export function createOAuthState(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return `rd_state_${globalThis.crypto.randomUUID().replace(/-/g, '')}`
    }
  } catch {
    // ignore
  }
  return `rd_state_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

/**
 * Wrapper de fetch com timeout configurável.
 */
async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timer)
  }
}

// ── OAuth / Credenciais (Marketing API) ─────────────────────────────────────

/**
 * Busca as credenciais OAuth do RD Station (client_id e client_secret).
 * Primeiro tenta o banco (Supabase), depois variáveis de ambiente.
 */
export async function getRDStationCredentials(): Promise<RDStationCredentials | null> {
  const envClientId = String(process.env.RD_STATION_CLIENT_ID || '').trim()
  const envClientSecret = String(process.env.RD_STATION_CLIENT_SECRET || '').trim()

  if (isSupabaseConfigured()) {
    try {
      const [dbClientIdRaw, dbClientSecretRaw] = await Promise.all([
        settingsDb.get(SETTINGS_KEYS.clientId),
        settingsDb.get(SETTINGS_KEYS.clientSecret),
      ])
      const dbClientId = String(dbClientIdRaw || '').trim()
      const dbClientSecret = String(dbClientSecretRaw || '').trim()

      if (dbClientId && dbClientSecret) {
        return { clientId: dbClientId, clientSecret: dbClientSecret }
      }
    } catch {
      // fallback para env
    }
  }

  if (envClientId && envClientSecret) {
    return { clientId: envClientId, clientSecret: envClientSecret }
  }

  return null
}

/**
 * Retorna informações públicas das credenciais OAuth (sem expor o secret).
 * Usado pela UI de configuração.
 */
export async function getRDStationCredentialsPublic(): Promise<RDStationCredentialsPublic> {
  const envClientId = String(process.env.RD_STATION_CLIENT_ID || '').trim()
  const envClientSecret = String(process.env.RD_STATION_CLIENT_SECRET || '').trim()

  if (isSupabaseConfigured()) {
    try {
      const [dbClientIdRaw, dbClientSecretRaw] = await Promise.all([
        settingsDb.get(SETTINGS_KEYS.clientId),
        settingsDb.get(SETTINGS_KEYS.clientSecret),
      ])
      const dbClientId = String(dbClientIdRaw || '').trim()
      const dbClientSecret = String(dbClientSecretRaw || '').trim()
      if (dbClientId || dbClientSecret) {
        const hasSecret = Boolean(dbClientSecret)
        return {
          clientId: dbClientId || null,
          source: 'db',
          hasClientSecret: hasSecret,
          isConfigured: Boolean(dbClientId && dbClientSecret),
        }
      }
    } catch {
      // ignore
    }
  }

  const hasEnv = Boolean(envClientId || envClientSecret)
  if (hasEnv) {
    return {
      clientId: envClientId || null,
      source: 'env',
      hasClientSecret: Boolean(envClientSecret),
      isConfigured: Boolean(envClientId && envClientSecret),
    }
  }

  return {
    clientId: null,
    source: 'none',
    hasClientSecret: false,
    isConfigured: false,
  }
}

/**
 * Constrói a URL de autorização OAuth do RD Station Marketing.
 */
export async function buildRDStationAuthUrl(state: string): Promise<string> {
  const credentials = await getRDStationCredentials()
  if (!credentials) {
    throw new Error('RD Station OAuth nao configurado')
  }

  const redirectUri = getRDStationRedirectUri()

  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: redirectUri,
    state,
  })

  return `${RD_MARKETING_BASE}/auth/dialog?${params.toString()}`
}

/**
 * Troca o código de autorização por tokens de acesso.
 */
export async function exchangeCodeForTokens(code: string): Promise<RDStationTokens> {
  const credentials = await getRDStationCredentials()
  if (!credentials) throw new Error('RD Station OAuth nao configurado')

  const redirectUri = getRDStationRedirectUri()

  const response = await fetchWithTimeout(`${RD_MARKETING_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg = (json as any)?.errors?.error_message || (json as any)?.error_description || (json as any)?.error || 'Falha ao trocar code RD Station'
    console.log('[RD Station] Erro ao trocar code:', msg)
    throw new Error(msg)
  }

  return {
    accessToken: String((json as any).access_token || ''),
    refreshToken: String((json as any).refresh_token || ''),
    expiryDate: (json as any).expires_in
      ? Date.now() + Number((json as any).expires_in) * 1000
      : Date.now() + 86400 * 1000,
  }
}

/**
 * Renova o access token usando o refresh token.
 */
async function refreshAccessToken(refreshToken: string): Promise<RDStationTokens> {
  const credentials = await getRDStationCredentials()
  if (!credentials) throw new Error('RD Station OAuth nao configurado')

  const response = await fetchWithTimeout(`${RD_MARKETING_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: refreshToken,
    }),
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg = (json as any)?.errors?.error_message || (json as any)?.error_description || (json as any)?.error || 'Falha ao renovar token RD Station'
    console.log('[RD Station] Erro ao renovar token:', msg)
    throw new Error(msg)
  }

  return {
    accessToken: String((json as any).access_token || ''),
    refreshToken: (json as any).refresh_token ? String((json as any).refresh_token) : refreshToken,
    expiryDate: (json as any).expires_in
      ? Date.now() + Number((json as any).expires_in) * 1000
      : Date.now() + 86400 * 1000,
  }
}

// ── Token Storage ───────────────────────────────────────────────────────────

/**
 * Recupera os tokens OAuth armazenados no Supabase.
 */
export async function getStoredTokens(): Promise<RDStationTokens | null> {
  if (!isSupabaseConfigured()) return null
  const raw = await settingsDb.get(SETTINGS_KEYS.tokens)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.accessToken) return null
    return parsed as RDStationTokens
  } catch {
    return null
  }
}

/**
 * Salva os tokens OAuth no Supabase.
 */
export async function saveTokens(tokens: RDStationTokens): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase nao configurado')
  }
  await settingsDb.set(SETTINGS_KEYS.tokens, JSON.stringify(tokens))
}

/**
 * Remove os tokens OAuth do Supabase.
 */
export async function clearTokens(): Promise<void> {
  if (!isSupabaseConfigured()) return
  await settingsDb.set(SETTINGS_KEYS.tokens, '')
}

/**
 * Garante que o access token está válido, renovando automaticamente se necessário.
 */
export async function ensureAccessToken(): Promise<RDStationTokens> {
  const current = await getStoredTokens()
  if (!current) throw new Error('RD Station Marketing nao conectado')

  const expiresAt = current.expiryDate || 0
  const safeWindowMs = 5 * 60 * 1000 // 5 minutos de margem
  if (expiresAt && Date.now() < expiresAt - safeWindowMs) {
    return current
  }

  if (!current.refreshToken) {
    return current
  }

  console.log('[RD Station] Renovando access token...')
  const refreshed = await refreshAccessToken(current.refreshToken)
  const merged = { ...current, ...refreshed }
  await saveTokens(merged)
  return merged
}

// ── CRM Config ──────────────────────────────────────────────────────────────

/**
 * Recupera a configuração do CRM (token, pipeline, stage, autoCreateDeal).
 */
export async function getRDStationConfig(): Promise<RDStationConfig | null> {
  if (!isSupabaseConfigured()) return null
  const raw = await settingsDb.get(SETTINGS_KEYS.config)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.crmToken) return null
    return parsed as RDStationConfig
  } catch {
    return null
  }
}

/**
 * Salva a configuração do CRM no Supabase.
 */
export async function saveRDStationConfig(config: RDStationConfig): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase nao configurado')
  }
  await settingsDb.set(SETTINGS_KEYS.config, JSON.stringify(config))
}

// ── Marketing API - Contatos ────────────────────────────────────────────────

/**
 * Fetch autenticado para a API de Marketing do RD Station.
 */
async function marketingFetch(path: string, init?: RequestInit): Promise<any> {
  const token = await ensureAccessToken()
  const response = await fetchWithTimeout(`${RD_MARKETING_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.accessToken}`,
      ...(init?.headers || {}),
    },
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg = (json as any)?.errors?.error_message || (json as any)?.error_message || (json as any)?.error || 'Falha na chamada RD Station Marketing'
    console.log('[RD Station] Marketing API erro:', msg)
    throw new Error(msg)
  }
  return json
}

/**
 * Cria ou atualiza um contato na API de Marketing do RD Station.
 * Usa PATCH para upsert pelo identificador (email ou phone).
 */
export async function createOrUpdateContact(data: {
  email?: string
  name?: string
  phone: string
  tags?: string[]
  cf_whatsapp?: string
}): Promise<any> {
  const payload: Record<string, unknown> = {
    personal_phone: data.phone,
  }

  if (data.email) payload.email = data.email
  if (data.name) payload.name = data.name
  if (data.tags && data.tags.length > 0) payload.tags = data.tags
  if (data.cf_whatsapp) payload.cf_whatsapp = data.cf_whatsapp

  console.log('[RD Station] Criando/atualizando contato:', data.phone)

  try {
    // Tenta PATCH (upsert) primeiro
    return await marketingFetch('/platform/contacts', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  } catch (patchError: any) {
    // Se falhar, tenta POST para criar
    console.log('[RD Station] PATCH falhou, tentando POST:', patchError?.message)
    return await marketingFetch('/platform/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}

// ── CRM API ─────────────────────────────────────────────────────────────────

/**
 * Fetch autenticado para a API CRM do RD Station.
 * Adiciona o token como query param.
 */
async function crmFetch(
  crmToken: string,
  path: string,
  init?: RequestInit,
): Promise<any> {
  const separator = path.includes('?') ? '&' : '?'
  const url = `${RD_CRM_BASE}${path}${separator}token=${encodeURIComponent(crmToken)}`

  const response = await fetchWithTimeout(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg = (json as any)?.errors?.[0]?.message || (json as any)?.message || (json as any)?.error || 'Falha na chamada RD Station CRM'
    console.log('[RD Station] CRM API erro:', msg)
    throw new Error(msg)
  }
  return json
}

/**
 * Resolve o token do CRM: usa o fornecido ou busca da configuração salva.
 */
async function resolveCrmToken(crmToken?: string): Promise<string> {
  if (crmToken) return crmToken
  const config = await getRDStationConfig()
  if (!config?.crmToken) throw new Error('CRM do RD Station nao configurado')
  return config.crmToken
}

/**
 * Lista os pipelines disponíveis no CRM.
 * Se crmToken não for informado, busca da configuração salva.
 */
export async function listPipelines(crmToken?: string): Promise<any[]> {
  const token = await resolveCrmToken(crmToken)
  console.log('[RD Station] Listando pipelines...')
  const data = await crmFetch(token, '/deal_pipelines')
  return Array.isArray(data) ? data : []
}

/**
 * Lista os estágios de um pipeline específico no CRM.
 * Se crmToken não for informado, busca da configuração salva.
 */
export async function listStages(crmToken: string | undefined, pipelineId: string): Promise<any[]> {
  const token = await resolveCrmToken(crmToken)
  console.log('[RD Station] Listando estágios do pipeline:', pipelineId)
  const data = await crmFetch(token, `/deal_stages?deal_pipeline_id=${encodeURIComponent(pipelineId)}`)
  return Array.isArray(data) ? data : []
}

/**
 * Dados para criação de um deal no CRM.
 */
export interface CreateDealData {
  name: string
  dealStageId?: string
  pipelineId?: string
  stageId?: string
  contactPhone?: string
  contactName?: string
  contactEmail?: string
}

/**
 * Cria um deal (negócio) no CRM do RD Station.
 * Aceita duas assinaturas:
 * - createDeal(crmToken, data) — com token explícito
 * - createDeal(data) — busca token da configuração salva
 */
export async function createDeal(
  crmTokenOrData: string | CreateDealData,
  data?: CreateDealData,
): Promise<any> {
  let token: string
  let dealData: CreateDealData

  if (typeof crmTokenOrData === 'string') {
    token = crmTokenOrData
    dealData = data!
  } else {
    token = await resolveCrmToken()
    dealData = crmTokenOrData
  }

  console.log('[RD Station] Criando deal:', dealData.name)

  const stageId = dealData.dealStageId || dealData.stageId

  const dealPayload: Record<string, unknown> = {
    name: dealData.name,
  }
  if (stageId) dealPayload.deal_stage_id = stageId
  if (dealData.pipelineId) dealPayload.deal_pipeline_id = dealData.pipelineId

  const payload: Record<string, unknown> = { deal: dealPayload }

  // Se tiver dados de contato, inclui no payload
  if (dealData.contactPhone || dealData.contactName || dealData.contactEmail) {
    const contacts: Array<Record<string, unknown>> = []
    const contact: Record<string, unknown> = {}
    if (dealData.contactName) contact.name = dealData.contactName
    if (dealData.contactEmail) contact.emails = [{ email: dealData.contactEmail }]
    if (dealData.contactPhone) contact.phones = [{ phone: dealData.contactPhone }]
    contacts.push(contact)
    dealPayload.contacts = contacts
  }

  return await crmFetch(token, '/deals', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Atualiza o estágio de um deal no CRM.
 * Se crmToken não for informado, busca da configuração salva.
 */
export async function updateDealStage(
  crmToken: string | undefined,
  dealId: string,
  stageId: string,
): Promise<any> {
  const token = await resolveCrmToken(crmToken)
  console.log('[RD Station] Atualizando deal', dealId, 'para estágio:', stageId)
  return await crmFetch(token, `/deals/${encodeURIComponent(dealId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      deal: {
        deal_stage_id: stageId,
      },
    }),
  })
}

/**
 * Cria uma atividade (nota) vinculada a um deal no CRM.
 * Se crmToken não for informado, busca da configuração salva.
 */
export async function createActivity(
  crmToken: string | undefined,
  dealId: string,
  text: string,
): Promise<any> {
  const token = await resolveCrmToken(crmToken)
  console.log('[RD Station] Criando atividade no deal:', dealId)
  return await crmFetch(token, '/activities', {
    method: 'POST',
    body: JSON.stringify({
      activity: {
        deal_id: dealId,
        text,
        type: 'note',
      },
    }),
  })
}

// ── Fluxo Completo de Resposta de Campanha ──────────────────────────────────

/**
 * Processa uma resposta de campanha: cria/atualiza contato no Marketing,
 * cria deal no CRM e registra atividade com a mensagem.
 *
 * @param phone - Telefone do contato (formato E.164)
 * @param contactName - Nome do contato (opcional)
 * @param message - Mensagem de resposta do contato (opcional)
 * @returns Dados do contato e deal criados, ou null se nenhuma integração configurada
 */
export async function handleCampaignReply(
  phone: string,
  contactName?: string,
  message?: string,
): Promise<{ contact: any; deal: any } | null> {
  const config = await getRDStationConfig()
  const hasMarketingTokens = !!(await getStoredTokens())

  if (!config && !hasMarketingTokens) {
    console.log('[RD Station] Nenhuma integração configurada, ignorando resposta de campanha')
    return null
  }

  let contact: any = null
  let deal: any = null

  // 1. Marketing API: criar/atualizar contato
  if (hasMarketingTokens) {
    try {
      contact = await createOrUpdateContact({
        phone,
        name: contactName,
        tags: ['tramontana-zap', 'whatsapp-reply'],
        cf_whatsapp: phone,
      })
      console.log('[RD Station] Contato criado/atualizado com sucesso')
    } catch (error: any) {
      console.log('[RD Station] Erro ao criar/atualizar contato:', error?.message)
    }
  }

  // 2. CRM API: criar deal (se configurado e autoCreateDeal ativo)
  if (config?.crmToken && config.autoCreateDeal) {
    const stageId = config.stageId || config.defaultStageId
    if (!stageId) {
      console.log('[RD Station] stageId não configurado, pulando criação de deal')
    } else {
      try {
        const dealName = contactName
          ? `WhatsApp - ${contactName}`
          : `WhatsApp - ${phone}`

        deal = await createDeal(config.crmToken, {
          name: dealName,
          dealStageId: stageId,
          pipelineId: config.pipelineId || config.defaultPipelineId,
          contactPhone: phone,
          contactName,
        })
        console.log('[RD Station] Deal criado com sucesso:', deal?.id || deal?._id)

        // 3. Criar atividade com a mensagem no deal
        if (deal && (deal.id || deal._id) && message) {
          const dealId = deal.id || deal._id
          try {
            await createActivity(
              config.crmToken,
              dealId,
              `Resposta via WhatsApp (Tramontana Zap):\n\n${message}`,
            )
            console.log('[RD Station] Atividade criada no deal:', dealId)
          } catch (actError: any) {
            console.log('[RD Station] Erro ao criar atividade:', actError?.message)
          }
        }
      } catch (dealError: any) {
        console.log('[RD Station] Erro ao criar deal:', dealError?.message)
      }
    }
  }

  if (!contact && !deal) {
    return null
  }

  return { contact, deal }
}

// ── Limpeza ─────────────────────────────────────────────────────────────────

/**
 * Remove toda a integração do RD Station (tokens OAuth e configuração CRM).
 */
export async function clearRDStationIntegration(): Promise<void> {
  console.log('[RD Station] Removendo integração completa...')
  await clearTokens()
  if (isSupabaseConfigured()) {
    await settingsDb.set(SETTINGS_KEYS.config, '')
  }
}
