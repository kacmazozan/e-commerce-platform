import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ProductPage from '../src/pages/product/ProductPage'
import { ThemeProvider } from '../src/context/ThemeContext'

const mockProduct = {
  id: 1,
  name: 'Merino Sweater',
  price: '89.99',
  category: "Women's Clothing",
  description: 'Soft merino wool',
  material: 'Merino Wool',
  stock: 20,
  available_stock: 20,
  sizes: ['XS', 'S', 'M', 'L'],
  model_height: '175cm',
  model_chest: '88cm',
  model_waist: '68cm',
  model_hips: '94cm',
  model_size: 'S',
  discount_percent: null,
  discounted_price: null,
}

const defaultProps = {
  productId: 1,
  onBack: vi.fn(),
  onAddToCart: vi.fn(),
  onAddToWishlist: vi.fn(),
  onRemoveFromWishlist: vi.fn(),
  wishlistItems: [],
  cartItems: [],
  onUpdateQuantity: vi.fn(),
  isLoggedIn: false,
  userEmail: null,
  token: null,
  onNavigate: vi.fn(),
  onRequireAuth: vi.fn(),
  onLogout: vi.fn(),
  cartCount: 0,
  wishlistCount: 0,
}

function stubFetch({ product = mockProduct, images = [], reviews = [] } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url) => {
      if (url.includes('/reviews')) {
        return Promise.resolve({ ok: true, json: async () => ({ reviews }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ product, images }) })
    })
  )
}

function renderPage(props = {}) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <ProductPage {...defaultProps} {...props} />
      </MemoryRouter>
    </ThemeProvider>
  )
}

describe('ProductPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // 1. Loading state
  it('shows loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    renderPage()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  // 2. Renders product name, price, and category after fetch
  it('renders product name, price, and category after fetch resolves', async () => {
    stubFetch()

    renderPage()

    expect(await screen.findByText('Merino Sweater')).toBeInTheDocument()
    expect(screen.getByText('$89.99')).toBeInTheDocument()
    // category label appears in the product info section (may also appear in footer nav)
    expect(screen.getAllByText("Women's Clothing").length).toBeGreaterThan(0)
  })

  // 3. Discounted price and strikethrough original price
  it('shows discounted price and strikethrough original price when discounted_price is set', async () => {
    stubFetch({
      product: {
        ...mockProduct,
        price: '89.99',
        discount_percent: 20,
        discounted_price: '71.99',
      },
    })

    renderPage()

    await screen.findByText('Merino Sweater')

    expect(screen.getByText('$71.99')).toBeInTheDocument()
    const strikethrough = screen.getByText('$89.99')
    expect(strikethrough).toBeInTheDocument()
    expect(strikethrough.tagName.toLowerCase()).toBe('span')
    expect(screen.getByText(/-20% OFF/i)).toBeInTheDocument()
  })

  // 4. Out of Stock when available_stock is 0
  it('shows "Out of Stock" and disables Add to Cart when available_stock is 0', async () => {
    stubFetch({ product: { ...mockProduct, available_stock: 0, sizes: null } })

    renderPage()

    const button = await screen.findByRole('button', { name: /out of stock/i })
    expect(button).toBeDisabled()
  })

  // 5. Calls onAddToCart with the product
  it('calls onAddToCart with the product when Add to Cart is clicked', async () => {
    const onAddToCart = vi.fn()
    stubFetch({ product: { ...mockProduct, sizes: null } })

    renderPage({ onAddToCart })

    await userEvent.click(await screen.findByRole('button', { name: /add to cart/i }))

    expect(onAddToCart).toHaveBeenCalledOnce()
    expect(onAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'Merino Sweater' }),
      expect.anything()
    )
  })

  // 6. Size selector — selecting a size and clicking Add to Cart
  it('shows size selector and allows selecting a size before adding to cart', async () => {
    const onAddToCart = vi.fn()
    stubFetch()

    renderPage({ onAddToCart })

    // Wait for product to load
    await screen.findByText('Merino Sweater')

    // Size buttons should be present
    const sButton = screen.getByRole('button', { name: 'S' })
    expect(sButton).toBeInTheDocument()

    // Select a size then add to cart
    await userEvent.click(sButton)
    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(onAddToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'S')
  })

  // 8. Size error when Add to Cart clicked without selecting a size
  it('shows size error if Add to Cart clicked without selecting a size', async () => {
    stubFetch()

    renderPage()

    await screen.findByText('Merino Sweater')

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(screen.getByText(/please select a size/i)).toBeInTheDocument()
  })

  // 9. Product description and material in info section
  it('shows product description and material in the info section', async () => {
    stubFetch()

    renderPage()

    await screen.findByText('Merino Sweater')

    expect(screen.getByText('Soft merino wool')).toBeInTheDocument()
    expect(screen.getByText('Merino Wool')).toBeInTheDocument()
  })

  // 10. Fit & Sizing sentence when model info is present
  it('shows fit & sizing sentence when model info is present', async () => {
    stubFetch()

    renderPage()

    await screen.findByText('Merino Sweater')

    expect(screen.getByText(/the model wears size S/i)).toBeInTheDocument()
    expect(screen.getByText(/height 175cm/i)).toBeInTheDocument()
  })

  // 11. Renders approved reviews
  it('renders approved reviews after fetch', async () => {
    stubFetch({
      reviews: [
        { id: 1, rating: 5, content: 'Amazing quality!', created_at: new Date().toISOString() },
        { id: 2, rating: 4, content: 'Great fit.', created_at: new Date().toISOString() },
      ],
    })

    renderPage()

    expect(await screen.findByText('Amazing quality!')).toBeInTheDocument()
    expect(screen.getByText('Great fit.')).toBeInTheDocument()
  })

  // 12. No reviews yet message
  it('shows "No reviews yet" when reviews array is empty', async () => {
    stubFetch({ reviews: [] })

    renderPage()

    await screen.findByText('Merino Sweater')

    await waitFor(() => {
      expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument()
    })
  })

  // 13. No review submission form on product page (form was moved to Past Orders)
  it('does not show a review submission form on the product page', async () => {
    stubFetch()

    renderPage()

    await screen.findByText('Merino Sweater')

    expect(screen.queryByRole('button', { name: /submit review/i })).not.toBeInTheDocument()
  })

  // 14. No log-in-to-review prompt on product page (prompt was moved to Past Orders)
  it('does not show a log-in-to-review prompt on the product page', async () => {
    stubFetch()

    renderPage()

    await screen.findByText('Merino Sweater')

    expect(
      screen.queryByRole('link', { name: /log in to write a review/i })
    ).not.toBeInTheDocument()
  })

  // 15. Calls onBack when Back button clicked
  it('calls onBack when Back button is clicked', async () => {
    const onBack = vi.fn()
    stubFetch()

    renderPage({ onBack })

    await screen.findByText('Merino Sweater')
    await userEvent.click(screen.getByRole('button', { name: /back/i }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
