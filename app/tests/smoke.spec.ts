import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// ---------------------------------------------------------------------------
// Pages publiques (pas d'auth requise)
// ---------------------------------------------------------------------------

const PUBLIC_PAGES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/rgpd/legal/cgu',
]

// ---------------------------------------------------------------------------
// Pages protegees (auth super_admin via storageState)
// ---------------------------------------------------------------------------

const PROTECTED_PAGES = [
  // Identity
  '/profile',
  '/admin/users',
  '/admin/roles',
  '/admin/permissions',
  '/admin/features',
  '/admin/settings',
  '/admin/database',
  '/admin/commands',
  '/admin/commands/history',

  // Preference
  '/profile/preferences',
  '/aide',

  // MFA
  '/profile/mfa',
  '/admin/mfa-policy',

  // Notification
  '/notifications',
  '/notifications/settings',

  // Event
  '/admin/events',
  '/admin/events/types',

  // RGPD
  '/rgpd/consent',
  '/rgpd/my-data',
  '/rgpd/rights',
  '/admin/rgpd',

  // Storybook
  '/admin/storybook',

  // Lifecycle
  '/admin/lifecycle',

  // Home (last: the root route may need the auth context fully warmed up)
  '/',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertPageRendersWithoutErrors(
  page: Page,
  path: string,
  expectNoLoginRedirect: boolean,
) {
  const jsErrors: string[] = []
  page.on('pageerror', (error) => jsErrors.push(error.message))

  // Use domcontentloaded: authenticated pages open SSE connections that
  // prevent networkidle from ever resolving.
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 15_000 })

  // Wait for the app to finish rendering. For protected pages, the SPA
  // needs to: load → detect has_session → call /auth/me → 401 →
  // refresh via cookie → retry /auth/me → render. Give it enough time.
  await page.waitForTimeout(expectNoLoginRedirect ? 4_000 : 2_000)

  // Protected pages should NOT redirect to /login
  if (expectNoLoginRedirect) {
    expect(page.url(), `Page ${path} redirected to login`).not.toContain('/login')
  }

  // Page should render some content (not blank)
  const bodyText = await page.locator('body').textContent()
  expect(bodyText?.trim().length, `Page ${path} has empty body`).toBeGreaterThan(0)

  // No uncaught JavaScript errors
  expect(jsErrors, `Page ${path} has JS errors: ${jsErrors.join(', ')}`).toEqual([])
}

// ---------------------------------------------------------------------------
// Tests — Public pages (fresh context, no auth)
// ---------------------------------------------------------------------------

test.describe('Public pages', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const path of PUBLIC_PAGES) {
    test(`${path} renders without errors`, async ({ page }) => {
      await assertPageRendersWithoutErrors(page, path, false)
    })
  }
})

// ---------------------------------------------------------------------------
// Tests — Protected pages
// Uses a SINGLE shared browser context to avoid refresh token rotation issues.
// Authenticates via a real browser login (POST to /api/auth/login) which
// lets the browser handle Set-Cookie natively — avoids storageState cookie
// quirks with localhost in headless Chromium.
// ---------------------------------------------------------------------------

test.describe('Protected pages', () => {
  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()

    // Navigate to the app first so we can execute JS in its origin
    await page.goto('/login', { waitUntil: 'domcontentloaded' })

    // Set RGPD consent in localStorage (required before any storage writes)
    await page.evaluate(() => {
      localStorage.setItem('rgpd_consent_given', '1')
      localStorage.setItem('rgpd_consent_necessary', '1')
      localStorage.setItem('rgpd_consent_functional', '1')
    })

    // Login via the API from within the browser context.
    // This ensures the Set-Cookie header is processed natively by the browser.
    const loginResult = await page.evaluate(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'CITestAdmin1A',
        }),
      })
      if (!res.ok) {
        return { ok: false, status: res.status, body: await res.text() }
      }
      const data = await res.json()
      // Store the access token marker
      localStorage.setItem('has_session', '1')
      return { ok: true, status: res.status, hasToken: !!data.access_token }
    })

    if (!loginResult.ok) {
      throw new Error(`Login failed: ${loginResult.status} ${(loginResult as any).body}`)
    }

    // Navigate to a protected page and wait for auth to fully resolve.
    // The SPA needs to: load → detect has_session → call /auth/me → 401 →
    // refresh via cookie → retry /auth/me → render.
    // We wait until the URL no longer contains /login (auth resolved).
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
    try {
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 10_000 })
    } catch {
      // If still on login after 10s, the auth failed — tests will report it
    }
    await page.waitForTimeout(1_000)
  })

  test.afterAll(async () => {
    await page?.close()
    await context?.close()
  })

  for (const path of PROTECTED_PAGES) {
    test(`${path} renders without errors`, async () => {
      await assertPageRendersWithoutErrors(page, path, true)
    })
  }
})
