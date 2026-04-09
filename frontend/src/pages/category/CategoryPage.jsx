import { useState, useEffect } from 'react'
import API_BASE from '../../api'

function BackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function HeartIcon({ filled }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}

export default function CategoryPage({
  category,
  onBack,
  onAddToCart,
  onRemoveFromCart,
  onAddToWishlist,
  onRemoveFromWishlist,
  cartItems = [],
  wishlistItems = [],
}) {
  const [products, setProducts] = useState([])
  const [loadedCategory, setLoadedCategory] = useState(null)
  const loading = loadedCategory !== category.title

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/api/products?category=${encodeURIComponent(category.title)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setProducts(data.products ?? [])
          setLoadedCategory(category.title)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([])
          setLoadedCategory(category.title)
        }
      })
    return () => {
      cancelled = true
    }
  }, [category.title])

  const cartIds = new Set(cartItems.map((i) => i.id))
  const wishlistIds = new Set(wishlistItems.map((i) => i.id))

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
      <header className="fixed top-0 right-0 left-0 z-[1000] border-b border-[var(--border)] bg-[rgba(var(--background-rgb),0.75)] px-6 backdrop-blur-[20px]">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4">
          <button
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-2.5 py-1.5 text-sm text-[var(--text)] transition-colors hover:bg-purple-400/12 hover:text-purple-400"
            onClick={onBack}
          >
            <BackIcon /> Back
          </button>
          <span className="ml-auto text-[22px] font-bold tracking-[4px] text-[var(--text-h)]">
            FIER
          </span>
        </div>
      </header>

      <main className="mx-auto box-border w-full max-w-[1280px] px-6 pt-12 pb-16">
        <div className="mb-10">
          <p className="m-0 mb-2.5 text-[11px] font-bold tracking-[5px] text-purple-400 uppercase">
            Collection
          </p>
          <h1 className="m-0 mb-2 text-[36px] font-extrabold tracking-[-1px] text-[var(--text-h)] max-[720px]:text-[28px]">
            {category.title}
          </h1>
          <p className="m-0 text-[15px] text-[var(--text)]">{category.subtitle}</p>
        </div>

        {loading && <p className="text-[var(--text)] opacity-60">Loading products…</p>}
        <div className="grid [grid-template-columns:repeat(4,1fr)] gap-5 max-[1024px]:[grid-template-columns:repeat(3,1fr)] max-[720px]:[grid-template-columns:repeat(2,1fr)] max-[720px]:gap-3.5 max-[420px]:[grid-template-columns:1fr]">
          {products.map((product) => {
            const inCart = cartIds.has(product.id)
            const inWishlist = wishlistIds.has(product.id)
            const availableStock = parseInt(product.available_stock ?? product.stock ?? 0)
            const outOfStock = availableStock === 0
            return (
              <div
                key={product.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl transition-[box-shadow,transform,border-color] duration-250 hover:-translate-y-1 hover:border-purple-400/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.15),0_0_0_1px_rgba(192,132,252,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]"
              >
                <div className="flex aspect-[3/4] w-full items-center justify-center border-b border-[var(--glass-border)] bg-purple-400/12">
                  <span className="text-[64px] font-bold text-purple-400 opacity-35 select-none">
                    {product.name[0]}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 px-4 pt-3.5 pb-2.5">
                  <span className="text-sm font-semibold text-[var(--text-h)]">{product.name}</span>
                  <span className="text-[15px] font-bold text-purple-400">
                    ${parseFloat(product.price).toFixed(2)}
                  </span>
                  <span
                    className={
                      availableStock < 10
                        ? 'text-[11px] font-semibold text-red-400'
                        : 'text-[11px] text-[var(--text)] opacity-50'
                    }
                  >
                    {availableStock === 0
                      ? 'Out of stock'
                      : availableStock < 10
                        ? `Only ${availableStock} left`
                        : `${availableStock} in stock`}
                  </span>
                </div>
                <div className="flex gap-2 px-3 pb-3.5">
                  <button
                    className={
                      outOfStock
                        ? 'flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-[13px] font-semibold text-[var(--text)] opacity-40'
                        : inCart
                          ? 'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-purple-400 bg-transparent px-3 py-2.5 text-[13px] font-semibold text-purple-400 transition-opacity hover:opacity-88'
                          : 'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-purple-400 px-3 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-88'
                    }
                    disabled={outOfStock && !inCart}
                    onClick={() =>
                      outOfStock
                        ? undefined
                        : inCart
                          ? onRemoveFromCart && onRemoveFromCart(product.id)
                          : onAddToCart && onAddToCart(product)
                    }
                  >
                    <CartIcon />{' '}
                    {outOfStock ? 'Out of Stock' : inCart ? 'Remove from Cart' : 'Add to Cart'}
                  </button>
                  <button
                    className={
                      inWishlist
                        ? 'flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-purple-400 bg-purple-400/12 text-purple-400 transition-colors'
                        : 'flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-transparent text-[var(--text)] transition-colors hover:border-purple-400 hover:text-purple-400'
                    }
                    aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                    onClick={() =>
                      inWishlist
                        ? onRemoveFromWishlist && onRemoveFromWishlist(product.id)
                        : onAddToWishlist && onAddToWishlist(product)
                    }
                  >
                    <HeartIcon filled={inWishlist} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
