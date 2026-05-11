import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import SearchPage from '../src/pages/search/SearchPage'

const defaultProps = {
  searchQuery: 'laptop',
  onBack: vi.fn(),
  onAddToWishlist: vi.fn(),
  onRemoveFromWishlist: vi.fn(),
  wishlistItems: [],
}

function renderPage(props = {}) {
  return render(
    <MemoryRouter>
      <SearchPage {...defaultProps} {...props} />
    </MemoryRouter>
  )
}

describe('SearchPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    renderPage()

    expect(screen.getByText(/loading products/i)).toBeInTheDocument()
  })

  it('fetches from the search endpoint with the correct query', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ products: [] }),
      })
    )

    renderPage({ searchQuery: 'laptop' })

    await vi.waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/products/search?q=laptop')
      )
    })

    await waitForElementToBeRemoved(() => screen.queryByText(/loading products/i))
  })

  it('URL-encodes the search query in the fetch URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ products: [] }),
      })
    )

    renderPage({ searchQuery: 'running shoes' })

    await vi.waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('q=running%20shoes'))
    })

    await waitForElementToBeRemoved(() => screen.queryByText(/loading products/i))
  })

  it('renders product name and price after fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Laptop Pro', price: '1299.99', stock: 5, available_stock: 5 }],
        }),
      })
    )

    renderPage()

    expect(await screen.findByText('Laptop Pro')).toBeInTheDocument()
    expect(screen.getByText('$1299.99')).toBeInTheDocument()
  })

  it('shows "Out of stock" badge when available_stock is 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Laptop Pro', price: '999.99', stock: 0, available_stock: 0 }],
        }),
      })
    )

    renderPage()

    expect(await screen.findByText('Out of stock')).toBeInTheDocument()
  })

  it('shows "No products found for" message when results are empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ products: [] }),
      })
    )

    renderPage({ searchQuery: 'zzznomatch' })

    expect(await screen.findByText(/no products found for "zzznomatch"/i)).toBeInTheDocument()
  })

  it('fetches all products when searchQuery is empty and shows them', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [
            { id: 1, name: 'All Products Item', price: '9.99', stock: 5, available_stock: 5 },
          ],
        }),
      })
    )

    renderPage({ searchQuery: '' })

    expect(await screen.findByText('All Products Item')).toBeInTheDocument()
    expect(screen.getByText('All Products')).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/products/search?q=')
    )
  })

  it('calls onAddToWishlist when wishlist button is clicked for item not in wishlist', async () => {
    const onAddToWishlist = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Laptop Pro', price: '999.99', stock: 5, available_stock: 5 }],
        }),
      })
    )

    renderPage({ onAddToWishlist })

    await userEvent.click(await screen.findByRole('button', { name: /add to wishlist/i }))

    expect(onAddToWishlist).toHaveBeenCalledOnce()
  })

  it('calls onRemoveFromWishlist when wishlist button is clicked for item in wishlist', async () => {
    const onRemoveFromWishlist = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Laptop Pro', price: '999.99', stock: 5, available_stock: 5 }],
        }),
      })
    )

    renderPage({ wishlistItems: [{ id: 1, name: 'Laptop Pro' }], onRemoveFromWishlist })

    await userEvent.click(await screen.findByRole('button', { name: /remove from wishlist/i }))

    expect(onRemoveFromWishlist).toHaveBeenCalledWith(1)
  })

  it('shows result count when products are found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [
            { id: 1, name: 'Laptop Pro', price: '999.99', stock: 5, available_stock: 5 },
            { id: 2, name: 'Laptop Stand', price: '49.99', stock: 8, available_stock: 8 },
          ],
        }),
      })
    )

    renderPage()

    expect(await screen.findByText('2 products found')).toBeInTheDocument()
  })

  it('shows error message on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    renderPage()

    await waitForElementToBeRemoved(() => screen.queryByText(/loading products/i))

    expect(screen.getByText(/failed to load products/i)).toBeInTheDocument()
  })
})
