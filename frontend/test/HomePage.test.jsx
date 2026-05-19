import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../src/pages/home/HomePage'
import { ThemeProvider } from '../src/context/ThemeContext'

vi.mock('../src/pages/home/components/HeroBanner', () => ({
  default: () => <div data-testid="hero-banner" />,
}))

const defaultProps = {
  isLoggedIn: false,
  userEmail: '',
  userName: '',
  token: null,
  onNavigate: vi.fn(),
  onRequireAuth: vi.fn(),
  onLogout: vi.fn(),
  cartCount: 0,
  wishlistCount: 0,
}

function renderPage(props = {}) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <HomePage {...defaultProps} {...props} />
      </ThemeProvider>
    </MemoryRouter>
  )
}

function stubHomeFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url) => {
      const requestUrl = String(url)
      if (requestUrl.includes('/api/products/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            categories: [
              { name: 'Electronics', product_count: 3 },
              { name: 'Footwear', product_count: 1 },
            ],
          }),
        })
      }

      if (requestUrl.includes('/api/products?limit=8')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            products: [
              {
                id: 42,
                name: 'Laptop Pro',
                category: 'Electronics',
                model: 'Prism-X',
                serial_number: 'EL-001',
                price: '1299.99',
                stock: 12,
                available_stock: 12,
                discount_percent: null,
                discounted_price: null,
              },
            ],
          }),
        })
      }

      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  )
}

describe('HomePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows product categories from the API and product properties on new releases', async () => {
    stubHomeFetch()

    renderPage()

    expect((await screen.findAllByText('Electronics')).length).toBeGreaterThan(0)
    expect(screen.getByText('3 products')).toBeInTheDocument()
    expect(screen.getAllByText('Footwear').length).toBeGreaterThan(0)
    expect(screen.getByText('1 product')).toBeInTheDocument()

    expect(await screen.findByText('Laptop Pro')).toBeInTheDocument()
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('#42')).toBeInTheDocument()
    expect(screen.getByText('Model')).toBeInTheDocument()
    expect(screen.getByText('Prism-X')).toBeInTheDocument()

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/products/categories')
      )
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/products?limit=8')
      )
    })
  })
})
