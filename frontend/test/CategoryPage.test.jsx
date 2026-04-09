import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import CategoryPage from '../src/pages/category/CategoryPage'

const category = { title: 'Electronics', subtitle: 'Gadgets and gear' }

const defaultProps = {
  category,
  onBack: vi.fn(),
  onAddToCart: vi.fn(),
  onRemoveFromCart: vi.fn(),
  onAddToWishlist: vi.fn(),
  onRemoveFromWishlist: vi.fn(),
  cartItems: [],
  wishlistItems: [],
}

function renderPage(props = {}) {
  return render(<CategoryPage {...defaultProps} {...props} />)
}

describe('CategoryPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    renderPage()

    expect(screen.getByText(/loading products/i)).toBeInTheDocument()
  })

  it('renders category title and subtitle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ products: [] }),
      })
    )

    renderPage()

    // Wait for loading to finish to avoid act warnings
    await waitForElementToBeRemoved(() => screen.queryByText(/loading products/i))

    expect(screen.getByText('Electronics')).toBeInTheDocument()
    expect(screen.getByText('Gadgets and gear')).toBeInTheDocument()
  })

  it('renders product cards with name and price after fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Widget', price: '19.99', stock: 10, available_stock: 10 }],
        }),
      })
    )

    renderPage()

    expect(await screen.findByText('Widget')).toBeInTheDocument()
    expect(screen.getByText('$19.99')).toBeInTheDocument()

    // Ensure loading is gone
    expect(screen.queryByText(/loading products/i)).not.toBeInTheDocument()
  })

  it('shows "n in stock" badge when available_stock >= 10', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Widget', price: '9.99', stock: 15, available_stock: 15 }],
        }),
      })
    )

    renderPage()

    expect(await screen.findByText('15 in stock')).toBeInTheDocument()
  })

  it('shows "Only n left" badge when available_stock is between 1 and 9', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Widget', price: '9.99', stock: 5, available_stock: 5 }],
        }),
      })
    )

    renderPage()

    expect(await screen.findByText('Only 5 left')).toBeInTheDocument()
  })

  it('shows "Out of stock" badge when available_stock is 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Widget', price: '9.99', stock: 0, available_stock: 0 }],
        }),
      })
    )

    renderPage()

    expect(await screen.findByText('Out of stock')).toBeInTheDocument()
  })

  it('disables cart button and shows "Out of Stock" when available_stock is 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Widget', price: '9.99', stock: 0, available_stock: 0 }],
        }),
      })
    )

    renderPage()

    const button = await screen.findByRole('button', { name: /out of stock/i })
    expect(button).toBeDisabled()
  })

  it('calls onAddToCart when "Add to Cart" is clicked for in-stock product', async () => {
    const onAddToCart = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Widget', price: '9.99', stock: 10, available_stock: 10 }],
        }),
      })
    )

    renderPage({ onAddToCart })

    await userEvent.click(await screen.findByRole('button', { name: /add to cart/i }))

    expect(onAddToCart).toHaveBeenCalledOnce()
    expect(onAddToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'Widget' }))
  })

  it('shows "Remove from Cart" when product is already in cart', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Widget', price: '9.99', stock: 10, available_stock: 10 }],
        }),
      })
    )

    renderPage({ cartItems: [{ id: 1, name: 'Widget' }] })

    expect(await screen.findByRole('button', { name: /remove from cart/i })).toBeInTheDocument()
  })

  it('calls onRemoveFromCart when "Remove from Cart" is clicked', async () => {
    const onRemoveFromCart = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Widget', price: '9.99', stock: 10, available_stock: 10 }],
        }),
      })
    )

    renderPage({ cartItems: [{ id: 1, name: 'Widget' }], onRemoveFromCart })

    await userEvent.click(await screen.findByRole('button', { name: /remove from cart/i }))

    expect(onRemoveFromCart).toHaveBeenCalledWith(1)
  })

  it('calls onAddToWishlist when wishlist button is clicked for item not in wishlist', async () => {
    const onAddToWishlist = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ id: 1, name: 'Widget', price: '9.99', stock: 10, available_stock: 10 }],
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
          products: [{ id: 1, name: 'Widget', price: '9.99', stock: 10, available_stock: 10 }],
        }),
      })
    )

    renderPage({ wishlistItems: [{ id: 1, name: 'Widget' }], onRemoveFromWishlist })

    await userEvent.click(await screen.findByRole('button', { name: /remove from wishlist/i }))

    expect(onRemoveFromWishlist).toHaveBeenCalledWith(1)
  })

  it('renders empty product grid (no cards) on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    renderPage()

    // loading disappears, no product cards rendered
    await waitForElementToBeRemoved(() => screen.queryByText(/loading products/i))

    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument()
  })

  it('calls onBack when Back button is clicked', async () => {
    const onBack = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ products: [] }),
      })
    )

    renderPage({ onBack })

    await userEvent.click(screen.getByRole('button', { name: /back/i }))

    expect(onBack).toHaveBeenCalledOnce()
  })

  it('fetches products using the category title in the URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ products: [] }),
      })
    )

    renderPage({ category: { title: 'Books', subtitle: 'All books' } })

    await vi.waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('category=Books'))
    })

    // Wait for loading to finish to avoid act warnings
    await waitForElementToBeRemoved(() => screen.queryByText(/loading products/i))
  })
})
