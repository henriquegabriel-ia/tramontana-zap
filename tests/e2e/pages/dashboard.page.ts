import { type Page } from '@playwright/test'

export class DashboardPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async screenshot(name: string) {
    await this.page.screenshot({
      path: `tests/e2e/screenshots/${name}.png`,
      fullPage: true,
    })
  }

  async navigateTo(baseURL: string, path: string) {
    await this.page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle', timeout: 30000 })
  }

  async getAllButtons() {
    return this.page.locator('button, a[role="button"], [role="button"]').all()
  }

  async getAllLinks() {
    return this.page.locator('a[href]').all()
  }

  async getAllInteractiveElements() {
    return this.page.locator('button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]').all()
  }

  async mapPageElements() {
    const buttons = await this.page.locator('button').allTextContents()
    const links = await this.page.locator('a[href]').evaluateAll(els =>
      els.map(el => ({ text: el.textContent?.trim() || '', href: (el as HTMLAnchorElement).href }))
    )
    const inputs = await this.page.locator('input, select, textarea').evaluateAll(els =>
      els.map(el => ({
        type: el.getAttribute('type') || el.tagName.toLowerCase(),
        name: el.getAttribute('name') || '',
        placeholder: el.getAttribute('placeholder') || '',
      }))
    )
    const headings = await this.page.locator('h1, h2, h3').allTextContents()

    return { buttons: buttons.filter(Boolean), links, inputs, headings: headings.filter(Boolean) }
  }
}
