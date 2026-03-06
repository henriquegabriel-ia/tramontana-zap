import { type Page, type Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.passwordInput = page.locator('input[type="password"]')
    this.loginButton = page.locator('button[type="submit"]')
    this.errorMessage = page.locator('[role="alert"], .error, [data-testid="error"]')
  }

  async goto(baseURL: string) {
    await this.page.goto(`${baseURL}/login`)
    await this.page.waitForLoadState('networkidle')
  }

  async login(password: string) {
    await this.passwordInput.fill(password)
    await this.loginButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  async screenshot(name: string) {
    await this.page.screenshot({
      path: `tests/e2e/screenshots/${name}.png`,
      fullPage: true,
    })
  }
}
