import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login.page'
import { DashboardPage } from './pages/dashboard.page'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'https://smartzap.escoladeautomacao.com.br'
const PASSWORD = 'h2so4nh3'

// Estrutura para coletar dados do relatório de QA
interface PageReport {
  path: string
  title: string
  status: 'OK' | 'ERRO' | 'REDIRECT' | 'PARCIAL'
  screenshotFile: string
  elements: {
    buttons: string[]
    links: { text: string; href: string }[]
    inputs: { type: string; name: string; placeholder: string }[]
    headings: string[]
  }
  errors: string[]
  loadTimeMs: number
}

const qaReport: PageReport[] = []

// Páginas do dashboard para testar
const DASHBOARD_PAGES = [
  { path: '/', name: 'dashboard-home', label: 'Dashboard (Home)' },
  { path: '/campaigns', name: 'campaigns', label: 'Campanhas' },
  { path: '/contacts', name: 'contacts', label: 'Contatos' },
  { path: '/templates', name: 'templates', label: 'Templates' },
  { path: '/flows', name: 'flows', label: 'Fluxos' },
  { path: '/inbox', name: 'inbox', label: 'Inbox' },
  { path: '/workflows', name: 'workflows', label: 'Workflows' },
  { path: '/forms', name: 'forms', label: 'Formulários' },
  { path: '/submissions', name: 'submissions', label: 'Submissões' },
  { path: '/settings', name: 'settings', label: 'Configurações' },
  { path: '/settings/ai', name: 'settings-ai', label: 'Config IA' },
  { path: '/settings/ai/agents', name: 'settings-ai-agents', label: 'Agentes IA' },
  { path: '/settings/attendants', name: 'settings-attendants', label: 'Atendentes' },
  { path: '/settings/meta-diagnostics', name: 'settings-meta-diagnostics', label: 'Meta Diagnósticos' },
  { path: '/settings/performance', name: 'settings-performance', label: 'Performance' },
]

test.describe('SmartZap QA - Mapeamento Completo', () => {
  test.setTimeout(180000) // 3 minutos por teste

  test('01 - Página de Login: Verificar layout e elementos', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto(BASE_URL)

    // Screenshot da página de login
    await loginPage.screenshot('01-login-page')

    // Verificar elementos essenciais
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.loginButton).toBeVisible()

    const dashboard = new DashboardPage(page)
    const elements = await dashboard.mapPageElements()

    qaReport.push({
      path: '/login',
      title: 'Página de Login',
      status: 'OK',
      screenshotFile: '01-login-page.png',
      elements,
      errors: [],
      loadTimeMs: 0,
    })
  })

  test('02 - Login: Autenticar com senha correta', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto(BASE_URL)

    const start = Date.now()
    await loginPage.login(PASSWORD)
    const loadTime = Date.now() - start

    // Após login deve redirecionar para o dashboard
    await page.waitForURL('**/', { timeout: 15000 }).catch(() => {})
    await loginPage.screenshot('02-post-login')

    const currentUrl = page.url()
    const isLoggedIn = !currentUrl.includes('/login')

    qaReport.push({
      path: '/login → redirect',
      title: 'Login com senha correta',
      status: isLoggedIn ? 'OK' : 'ERRO',
      screenshotFile: '02-post-login.png',
      elements: { buttons: [], links: [], inputs: [], headings: [] },
      errors: isLoggedIn ? [] : ['Login não redirecionou para o dashboard'],
      loadTimeMs: loadTime,
    })

    expect(isLoggedIn).toBeTruthy()
  })

  test('03 - Login: Tentar senha incorreta', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto(BASE_URL)

    await loginPage.login('senha_errada_123')
    await page.waitForTimeout(2000)
    await loginPage.screenshot('03-login-wrong-password')

    const stillOnLogin = page.url().includes('/login')

    qaReport.push({
      path: '/login',
      title: 'Login com senha incorreta',
      status: stillOnLogin ? 'OK' : 'ERRO',
      screenshotFile: '03-login-wrong-password.png',
      elements: { buttons: [], links: [], inputs: [], headings: [] },
      errors: stillOnLogin ? [] : ['Sistema permitiu login com senha errada'],
      loadTimeMs: 0,
    })

    expect(stillOnLogin).toBeTruthy()
  })

  // Teste para cada página do dashboard
  for (const dashPage of DASHBOARD_PAGES) {
    test(`04+ - ${dashPage.label}: Mapear funcionalidades (${dashPage.path})`, async ({ page }) => {
      // Login primeiro
      const loginPage = new LoginPage(page)
      await loginPage.goto(BASE_URL)
      await loginPage.login(PASSWORD)
      await page.waitForURL('**/', { timeout: 15000 }).catch(() => {})

      const dashboard = new DashboardPage(page)
      const errors: string[] = []
      let status: PageReport['status'] = 'OK'

      // Navegar para a página
      const start = Date.now()
      try {
        await dashboard.navigateTo(BASE_URL, dashPage.path)
      } catch (e) {
        errors.push(`Timeout ao carregar página: ${(e as Error).message}`)
        status = 'ERRO'
      }
      const loadTime = Date.now() - start

      // Esperar estabilizar
      await page.waitForTimeout(2000)

      // Verificar se houve redirect para login (sessão expirada)
      if (page.url().includes('/login')) {
        status = 'REDIRECT'
        errors.push('Redirecionado para login - possível problema de sessão')
      }

      // Capturar screenshot
      await dashboard.screenshot(`page-${dashPage.name}`)

      // Mapear elementos
      let elements = { buttons: [] as string[], links: [] as { text: string; href: string }[], inputs: [] as { type: string; name: string; placeholder: string }[], headings: [] as string[] }
      try {
        elements = await dashboard.mapPageElements()
      } catch (e) {
        errors.push(`Erro ao mapear elementos: ${(e as Error).message}`)
        if (status === 'OK') status = 'PARCIAL'
      }

      // Verificar console errors
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })

      qaReport.push({
        path: dashPage.path,
        title: dashPage.label,
        status,
        screenshotFile: `page-${dashPage.name}.png`,
        elements,
        errors: [...errors, ...consoleErrors],
        loadTimeMs: loadTime,
      })
    })
  }

  test('99 - Navegação: Verificar sidebar e menu principal', async ({ page }) => {
    // Login
    const loginPage = new LoginPage(page)
    await loginPage.goto(BASE_URL)
    await loginPage.login(PASSWORD)
    await page.waitForURL('**/', { timeout: 15000 }).catch(() => {})

    const dashboard = new DashboardPage(page)

    // Mapear sidebar / navegação
    const navLinks = await page.locator('nav a[href], aside a[href], [data-sidebar] a[href]').evaluateAll(els =>
      els.map(el => ({
        text: el.textContent?.trim() || '',
        href: (el as HTMLAnchorElement).getAttribute('href') || '',
      }))
    )

    await dashboard.screenshot('99-sidebar-navigation')

    qaReport.push({
      path: '/sidebar',
      title: 'Sidebar / Navegação Principal',
      status: 'OK',
      screenshotFile: '99-sidebar-navigation.png',
      elements: {
        buttons: [],
        links: navLinks,
        inputs: [],
        headings: [],
      },
      errors: [],
      loadTimeMs: 0,
    })
  })

  test.afterAll(async () => {
    // Gerar relatório final em Markdown
    const reportDir = 'tests/e2e/screenshots'
    let report = `# Relatório de QA - SmartZap\n\n`
    report += `**URL testada:** ${BASE_URL}\n`
    report += `**Data:** ${new Date().toISOString().split('T')[0]}\n`
    report += `**Total de páginas testadas:** ${qaReport.length}\n\n`

    const okCount = qaReport.filter(r => r.status === 'OK').length
    const errorCount = qaReport.filter(r => r.status === 'ERRO').length
    const redirectCount = qaReport.filter(r => r.status === 'REDIRECT').length
    const partialCount = qaReport.filter(r => r.status === 'PARCIAL').length

    report += `## Resumo\n\n`
    report += `| Status | Quantidade |\n|--------|------------|\n`
    report += `| OK | ${okCount} |\n`
    report += `| ERRO | ${errorCount} |\n`
    report += `| REDIRECT | ${redirectCount} |\n`
    report += `| PARCIAL | ${partialCount} |\n\n`

    report += `---\n\n`

    for (const page of qaReport) {
      const statusEmoji = page.status === 'OK' ? '[OK]' : page.status === 'ERRO' ? '[ERRO]' : page.status === 'REDIRECT' ? '[REDIRECT]' : '[PARCIAL]'

      report += `## ${statusEmoji} ${page.title} (\`${page.path}\`)\n\n`
      report += `- **Screenshot:** \`${page.screenshotFile}\`\n`
      report += `- **Tempo de carregamento:** ${page.loadTimeMs}ms\n`

      if (page.elements.headings.length > 0) {
        report += `- **Títulos na página:** ${page.elements.headings.join(', ')}\n`
      }

      if (page.elements.buttons.length > 0) {
        report += `\n### Botões encontrados (${page.elements.buttons.length})\n\n`
        for (const btn of page.elements.buttons) {
          report += `- \`${btn}\`\n`
        }
      }

      if (page.elements.links.length > 0) {
        report += `\n### Links encontrados (${page.elements.links.length})\n\n`
        report += `| Texto | Href |\n|-------|------|\n`
        for (const link of page.elements.links.slice(0, 30)) {
          report += `| ${link.text.replace(/\|/g, '\\|').substring(0, 50)} | ${link.href.replace(/\|/g, '\\|').substring(0, 80)} |\n`
        }
        if (page.elements.links.length > 30) {
          report += `| ... | (${page.elements.links.length - 30} mais links) |\n`
        }
      }

      if (page.elements.inputs.length > 0) {
        report += `\n### Campos de formulário (${page.elements.inputs.length})\n\n`
        report += `| Tipo | Nome | Placeholder |\n|------|------|-------------|\n`
        for (const input of page.elements.inputs) {
          report += `| ${input.type} | ${input.name} | ${input.placeholder} |\n`
        }
      }

      if (page.errors.length > 0) {
        report += `\n### Erros encontrados\n\n`
        for (const err of page.errors) {
          report += `- ${err}\n`
        }
      }

      report += `\n---\n\n`
    }

    fs.writeFileSync(path.join(reportDir, 'QA-REPORT.md'), report, 'utf-8')
    fs.writeFileSync(path.join(reportDir, 'qa-report-data.json'), JSON.stringify(qaReport, null, 2), 'utf-8')
    console.log(`\n📋 Relatório de QA gerado em: ${reportDir}/QA-REPORT.md`)
  })
})
