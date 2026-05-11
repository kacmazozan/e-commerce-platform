import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import { ThemeProvider } from '../src/context/ThemeContext'

// HeroBanner calls window.matchMedia which JSDOM does not provide.
// Mock it the same way the existing HomePage.test.jsx does.
vi.mock('../src/pages/home/components/HeroBanner', () => ({
  default: () => <div data-testid="hero-banner" />,
}))

// Minimal valid JWT: decodeJwtPayload splits on '.' and base64-decodes part[1]
function makeToken(payload) {
  return `x.${btoa(JSON.stringify(payload))}.x`
}

const fakeToken = makeToken({ email: 'user@test.com', role: 'customer' })
const guestCartItem = { id: 1, name: 'Widget', price: '9.99', quantity: 2, size: '' }
const mergedServerItem = {
  id: 1,
  name: 'Widget',
  price: '9.99',
  quantity: 2,
  size: '',
  available_stock: '50',
}

// URL/method-based dispatch so concurrent calls (e.g. the parallel
// GET /api/cart + GET /api/wishlist in handleLogin) don't depend on call order.
function makeFetchMock({ cartPostOk = true } = {}) {
  return vi.fn(async (url, opts = {}) => {
    const method = (opts?.method || 'GET').toUpperCase()

    if (url.includes('/api/auth/login'))
      return { ok: true, status: 200, json: async () => ({ token: fakeToken }) }

    if (url.includes('/api/auth/me'))
      return { ok: true, status: 200, json: async () => ({ email: 'user@test.com', name: 'User' }) }

    if (url.includes('/api/cart') && method === 'POST')
      return {
        ok: cartPostOk,
        status: cartPostOk ? 200 : 500,
        json: async () => (cartPostOk ? { items: [mergedServerItem] } : { error: 'Server error' }),
      }

    if (url.includes('/api/cart'))
      return { ok: true, status: 200, json: async () => ({ items: [mergedServerItem] }) }

    if (url.includes('/api/wishlist'))
      return { ok: true, status: 200, json: async () => ({ items: [] }) }

    if (url.includes('/api/notifications'))
      return { ok: true, status: 200, json: async () => ({ notifications: [] }) }

    if (url.includes('/api/products'))
      return { ok: true, status: 200, json: async () => ({ products: [], categories: [] }) }

    return { ok: true, status: 200, json: async () => ({}) }
  })
}

function renderApp() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    </ThemeProvider>
  )
}

async function submitLoginForm() {
  await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'password123')
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('Guest cart merge on login', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    localStorage.setItem('guest_cart', JSON.stringify([guestCartItem]))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs each guest cart item to /api/cart with correct payload after successful login', async () => {
    vi.stubGlobal('fetch', makeFetchMock())
    renderApp()
    await submitLoginForm()

    await waitFor(() => {
      const cartPosts = fetch.mock.calls.filter(
        ([url, opts]) => url.includes('/api/cart') && (opts?.method || '').toUpperCase() === 'POST'
      )
      expect(cartPosts).toHaveLength(1)
      expect(JSON.parse(cartPosts[0][1].body)).toMatchObject({
        productId: 1,
        quantity: 2,
        size: '',
      })
    })
  })

  it('clears guest_cart from localStorage only after the confirmation GET succeeds', async () => {
    vi.stubGlobal('fetch', makeFetchMock())
    renderApp()
    await submitLoginForm()

    await waitFor(() => {
      expect(localStorage.removeItem).toHaveBeenCalledWith('guest_cart')
    })
  })

  it('keeps guest_cart in localStorage when the merge POSTs fail', async () => {
    vi.stubGlobal('fetch', makeFetchMock({ cartPostOk: false }))
    renderApp()
    await submitLoginForm()

    // handleLogin always calls navigate('/') as its last step — success or failure.
    // Waiting for the hero banner confirms the navigation has completed and
    // handleLogin has finished, so removeItem would already have been called
    // if the merge had succeeded.
    await screen.findByTestId('hero-banner')

    expect(localStorage.removeItem).not.toHaveBeenCalledWith('guest_cart')
  })
})
