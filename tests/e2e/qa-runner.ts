#!/usr/bin/env npx tsx
/**
 * Script de QA para SmartZap
 *
 * Executa testes funcionais contra o site usando Node.js fetch + jsdom.
 * Uso: npx tsx tests/e2e/qa-runner.ts [URL] [SENHA]
 *
 * Exemplo:
 *   npx tsx tests/e2e/qa-runner.ts https://smartzap.escoladeautomacao.com.br h2so4nh3
 */

import { JSDOM } from 'jsdom'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = process.argv[2] || 'https://smartzap.escoladeautomacao.com.br'
const PASSWORD = process.argv[3] || 'h2so4nh3'

interface PageReport {
  path: string
  title: string
  status: 'OK' | 'ERRO' | 'REDIRECT' | 'PARCIAL'
  httpStatus: number
  elements: {
    buttons: string[]
    links: { text: string; href: string }[]
    inputs: { type: string; name: string; placeholder: string }[]
    headings: string[]
  }
  errors: string[]
  loadTimeMs: number
}

const reports: PageReport[] = []

function mapElements(dom: JSDOM) {
  const doc = dom.window.document

  const buttons = Array.from(doc.querySelectorAll('button'))
    .map(b => b.textContent?.trim() || '')
    .filter(Boolean)

  const links = Array.from(doc.querySelectorAll('a[href]'))
    .map(a => ({
      text: a.textContent?.trim() || '',
      href: a.getAttribute('href') || '',
    }))

  const inputs = Array.from(doc.querySelectorAll('input, select, textarea'))
    .map(el => ({
      type: el.getAttribute('type') || el.tagName.toLowerCase(),
      name: el.getAttribute('name') || '',
      placeholder: el.getAttribute('placeholder') || '',
    }))

  const headings = Array.from(doc.querySelectorAll('h1, h2, h3'))
    .map(h => h.textContent?.trim() || '')
    .filter(Boolean)

  return { buttons, links, inputs, headings }
}

async function testLogin(): Promise<string | null> {
  console.log('\n=== Testando Login ===')

  try {
    // 1. Buscar página de login
    const loginResp = await fetch(`${BASE_URL}/login`)
    const loginHtml = await loginResp.text()
    const dom = new JSDOM(loginHtml)
    const elements = mapElements(dom)

    reports.push({
      path: '/login',
      title: 'Página de Login',
      status: loginResp.ok ? 'OK' : 'ERRO',
      httpStatus: loginResp.status,
      elements,
      errors: loginResp.ok ? [] : [`HTTP ${loginResp.status}`],
      loadTimeMs: 0,
    })

    // 2. Fazer login via API
    const start = Date.now()
    const authResp = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD }),
      redirect: 'manual',
    })
    const loadTime = Date.now() - start

    const cookies = authResp.headers.get('set-cookie')

    if (authResp.ok || authResp.status === 302) {
      console.log(`  Login OK (${loadTime}ms)`)
      console.log(`  Cookies: ${cookies ? 'recebidos' : 'nenhum'}`)

      reports.push({
        path: '/api/auth/login',
        title: 'Login API',
        status: 'OK',
        httpStatus: authResp.status,
        elements: { buttons: [], links: [], inputs: [], headings: [] },
        errors: [],
        loadTimeMs: loadTime,
      })

      return cookies
    } else {
      const body = await authResp.text()
      console.log(`  Login FALHOU: HTTP ${authResp.status} - ${body}`)

      reports.push({
        path: '/api/auth/login',
        title: 'Login API',
        status: 'ERRO',
        httpStatus: authResp.status,
        elements: { buttons: [], links: [], inputs: [], headings: [] },
        errors: [`HTTP ${authResp.status}: ${body}`],
        loadTimeMs: loadTime,
      })

      return null
    }
  } catch (err) {
    console.error(`  Erro de conexão: ${(err as Error).message}`)
    reports.push({
      path: '/login',
      title: 'Conexão com o servidor',
      status: 'ERRO',
      httpStatus: 0,
      elements: { buttons: [], links: [], inputs: [], headings: [] },
      errors: [(err as Error).message],
      loadTimeMs: 0,
    })
    return null
  }
}

async function testWrongPassword() {
  console.log('\n=== Testando Login com Senha Incorreta ===')

  try {
    const resp = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'senha_errada_123' }),
    })

    const rejected = !resp.ok
    console.log(`  Senha incorreta ${rejected ? 'rejeitada corretamente' : 'ACEITA (BUG!)'}`)

    reports.push({
      path: '/api/auth/login (wrong password)',
      title: 'Login com senha incorreta',
      status: rejected ? 'OK' : 'ERRO',
      httpStatus: resp.status,
      elements: { buttons: [], links: [], inputs: [], headings: [] },
      errors: rejected ? [] : ['Sistema aceitou senha incorreta!'],
      loadTimeMs: 0,
    })
  } catch (err) {
    console.error(`  Erro: ${(err as Error).message}`)
  }
}

async function testPage(pagePath: string, label: string, cookies: string) {
  console.log(`  Testando ${label} (${pagePath})...`)

  try {
    const start = Date.now()
    const resp = await fetch(`${BASE_URL}${pagePath}`, {
      headers: { Cookie: cookies },
      redirect: 'follow',
    })
    const loadTime = Date.now() - start
    const html = await resp.text()
    const dom = new JSDOM(html)
    const elements = mapElements(dom)

    const isRedirectedToLogin = resp.url.includes('/login') || html.includes('Entrar') && html.includes('Senha')
    let status: PageReport['status'] = 'OK'
    const errors: string[] = []

    if (!resp.ok) {
      status = 'ERRO'
      errors.push(`HTTP ${resp.status}`)
    } else if (isRedirectedToLogin) {
      status = 'REDIRECT'
      errors.push('Redirecionado para login (sessão não mantida)')
    }

    reports.push({
      path: pagePath,
      title: label,
      status,
      httpStatus: resp.status,
      elements,
      errors,
      loadTimeMs: loadTime,
    })

    console.log(`    ${status} (${loadTime}ms) - ${elements.buttons.length} botões, ${elements.links.length} links`)
  } catch (err) {
    console.error(`    ERRO: ${(err as Error).message}`)
    reports.push({
      path: pagePath,
      title: label,
      status: 'ERRO',
      httpStatus: 0,
      elements: { buttons: [], links: [], inputs: [], headings: [] },
      errors: [(err as Error).message],
      loadTimeMs: 0,
    })
  }
}

async function testApiEndpoints(cookies: string) {
  console.log('\n=== Testando API Endpoints ===')

  const endpoints = [
    { path: '/api/health', method: 'GET', label: 'Health Check', auth: false },
    { path: '/api/auth/status', method: 'GET', label: 'Auth Status', auth: false },
    { path: '/api/campaigns', method: 'GET', label: 'Listar Campanhas', auth: true },
    { path: '/api/contacts', method: 'GET', label: 'Listar Contatos', auth: true },
    { path: '/api/templates', method: 'GET', label: 'Listar Templates', auth: true },
    { path: '/api/flows', method: 'GET', label: 'Listar Fluxos', auth: false },
    { path: '/api/settings', method: 'GET', label: 'Configurações', auth: true },
  ]

  for (const ep of endpoints) {
    try {
      const start = Date.now()
      const resp = await fetch(`${BASE_URL}${ep.path}`, {
        method: ep.method,
        headers: ep.auth ? { Cookie: cookies } : {},
      })
      const loadTime = Date.now() - start

      console.log(`  ${ep.label}: HTTP ${resp.status} (${loadTime}ms)`)

      reports.push({
        path: ep.path,
        title: `API: ${ep.label}`,
        status: resp.ok ? 'OK' : resp.status === 401 ? 'REDIRECT' : 'ERRO',
        httpStatus: resp.status,
        elements: { buttons: [], links: [], inputs: [], headings: [] },
        errors: resp.ok ? [] : [`HTTP ${resp.status}`],
        loadTimeMs: loadTime,
      })
    } catch (err) {
      console.error(`  ${ep.label}: ERRO - ${(err as Error).message}`)
    }
  }
}

function generateReport() {
  const reportDir = 'tests/e2e/screenshots'
  fs.mkdirSync(reportDir, { recursive: true })

  let report = `# Relatório de QA - SmartZap\n\n`
  report += `**URL testada:** ${BASE_URL}\n`
  report += `**Data:** ${new Date().toISOString().split('T')[0]}\n`
  report += `**Total de testes:** ${reports.length}\n\n`

  const okCount = reports.filter(r => r.status === 'OK').length
  const errorCount = reports.filter(r => r.status === 'ERRO').length
  const redirectCount = reports.filter(r => r.status === 'REDIRECT').length

  report += `## Resumo\n\n`
  report += `| Status | Quantidade |\n|--------|------------|\n`
  report += `| OK | ${okCount} |\n`
  report += `| ERRO | ${errorCount} |\n`
  report += `| REDIRECT | ${redirectCount} |\n\n`
  report += `---\n\n`

  for (const page of reports) {
    const statusTag = page.status === 'OK' ? '[OK]' : page.status === 'ERRO' ? '[ERRO]' : '[REDIRECT]'
    report += `## ${statusTag} ${page.title} (\`${page.path}\`)\n\n`
    report += `- **HTTP Status:** ${page.httpStatus}\n`
    report += `- **Tempo de carregamento:** ${page.loadTimeMs}ms\n`

    if (page.elements.headings.length > 0) {
      report += `- **Títulos:** ${page.elements.headings.join(', ')}\n`
    }

    if (page.elements.buttons.length > 0) {
      report += `\n### Botões (${page.elements.buttons.length})\n`
      for (const btn of page.elements.buttons) {
        report += `- \`${btn}\`\n`
      }
    }

    if (page.elements.links.length > 0) {
      report += `\n### Links (${page.elements.links.length})\n`
      report += `| Texto | Href |\n|-------|------|\n`
      for (const link of page.elements.links.slice(0, 30)) {
        report += `| ${link.text.replace(/\|/g, '\\|').substring(0, 50)} | ${link.href.substring(0, 80)} |\n`
      }
    }

    if (page.elements.inputs.length > 0) {
      report += `\n### Inputs (${page.elements.inputs.length})\n`
      report += `| Tipo | Nome | Placeholder |\n|------|------|-------------|\n`
      for (const inp of page.elements.inputs) {
        report += `| ${inp.type} | ${inp.name} | ${inp.placeholder} |\n`
      }
    }

    if (page.errors.length > 0) {
      report += `\n### Erros\n`
      for (const err of page.errors) {
        report += `- ${err}\n`
      }
    }
    report += `\n---\n\n`
  }

  const reportPath = path.join(reportDir, 'QA-REPORT.md')
  fs.writeFileSync(reportPath, report, 'utf-8')
  fs.writeFileSync(path.join(reportDir, 'qa-report-data.json'), JSON.stringify(reports, null, 2), 'utf-8')
  console.log(`\nRelatório gerado: ${reportPath}`)
}

const DASHBOARD_PAGES = [
  { path: '/', label: 'Dashboard (Home)' },
  { path: '/campaigns', label: 'Campanhas' },
  { path: '/contacts', label: 'Contatos' },
  { path: '/templates', label: 'Templates' },
  { path: '/flows', label: 'Fluxos' },
  { path: '/inbox', label: 'Inbox' },
  { path: '/workflows', label: 'Workflows' },
  { path: '/forms', label: 'Formulários' },
  { path: '/submissions', label: 'Submissões' },
  { path: '/settings', label: 'Configurações' },
  { path: '/settings/ai', label: 'Config IA' },
  { path: '/settings/ai/agents', label: 'Agentes IA' },
  { path: '/settings/attendants', label: 'Atendentes' },
  { path: '/settings/meta-diagnostics', label: 'Meta Diagnósticos' },
  { path: '/settings/performance', label: 'Performance' },
]

async function main() {
  console.log(`SmartZap QA Runner`)
  console.log(`URL: ${BASE_URL}`)
  console.log(`=`.repeat(50))

  // Teste de login
  await testWrongPassword()
  const cookies = await testLogin()

  if (!cookies) {
    console.error('\nLogin falhou - não é possível testar páginas autenticadas.')
    console.log('Gerando relatório parcial...')
    generateReport()
    return
  }

  // Testar páginas do dashboard
  console.log('\n=== Testando Páginas do Dashboard ===')
  for (const page of DASHBOARD_PAGES) {
    await testPage(page.path, page.label, cookies)
  }

  // Testar API endpoints
  await testApiEndpoints(cookies)

  // Gerar relatório
  generateReport()
}

main().catch(console.error)
