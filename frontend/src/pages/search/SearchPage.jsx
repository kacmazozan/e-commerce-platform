import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API_BASE from '../../api'
import { SORT_OPTIONS } from '../../constants/sortOptions'

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

function SearchIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

export default function SearchPage({
  searchQuery,
  onBack,
  onAddToWishlist,
  onRemoveFromWishlist,
  wishlistItems = [],
}) {
  const [products, setProducts] = useState([])
  const [loadedKey, setLoadedKey] = useState(null)
  const [inputValue, setInputValue] = useState(searchQuery)
  const [sort, setSort] = useState('newest')
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery)
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  if (prevSearchQuery !== searchQuery) {
    setPrevSearchQuery(searchQuery)
    setSort('newest')
  }

  const currentKey = `${searchQuery}::${sort}`
  const loading = loadedKey !== currentKey

  useEffect(() => {
    let cancelled = false
    setError(false)
    fetch(`${API_BASE}/api/products/search?q=${encodeURIComponent(searchQuery)}&sort=${sort}`)
      .then((r) => {
        if (!r.ok) throw new Error('Server error')
        return r.json()
      })
      .then((data) => {
        if (!cancelled) {
          setProducts(data.products ?? [])
          setLoadedKey(currentKey)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([])
          setError(true)
          setLoadedKey(currentKey)
        }
      })
    return () => {
      cancelled = true
    }
  }, [searchQuery, sort])

  useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])

  function handleSearchSubmit(e) {
    e.preventDefault()
    const q = inputValue.trim()
    if (q.length !== 1)
      navigate(q ? '/search?q=' + encodeURIComponent(q) : '/search', { replace: true })
  }

  const wishlistIds = new Set(wishlistItems.map((i) => i.id))

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
      <header className="fixed top-0 right-0 left-0 z-[1000] border-b border-[var(--border)] bg-[rgba(var(--background-rgb),0.75)] px-6 backdrop-blur-[20px]">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-2.5 py-1.5 text-sm text-[var(--text)] transition-colors hover:bg-purple-400/12 hover:text-purple-400"
            onClick={onBack}
          >
            <BackIcon /> Back
          </button>
          <form
            onSubmit={handleSearchSubmit}
            className="flex h-9 flex-1 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-3 backdrop-blur-xl transition-[border-color] focus-within:border-purple-400/50"
          >
            <button
              type="submit"
              aria-label="Search"
              className="flex items-center border-none bg-transparent p-0 text-[var(--text)] hover:text-purple-400"
            >
              <SearchIcon />
            </button>
            <input
              type="text"
              placeholder="Search products…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 border-none bg-transparent text-sm text-[var(--text-h)] outline-none placeholder:text-[var(--text)]/40"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md border-none bg-purple-400/15 px-2.5 py-1 text-[12px] font-semibold text-purple-400 transition-colors hover:bg-purple-400/28"
            >
              Search
            </button>
          </form>
          <Link
            to="/"
            className="ml-auto shrink-0 cursor-pointer text-[22px] font-bold tracking-[4px] text-[var(--text-h)] no-underline"
          >
            FIER
          </Link>
        </div>
      </header>

      <main className="mx-auto box-border w-full max-w-[1280px] px-6 pt-12 pb-16">
        <div className="mb-10">
          <p className="m-0 mb-2.5 text-[11px] font-bold tracking-[5px] text-purple-400 uppercase">
            Search
          </p>
          <h1 className="m-0 mb-2 text-[36px] font-extrabold tracking-[-1px] text-[var(--text-h)] max-[720px]:text-[28px]">
            {searchQuery ? `Results for "${searchQuery}"` : 'All Products'}
          </h1>
          {!loading && (
            <p className="m-0 text-[15px] text-[var(--text)]">
              {error
                ? 'Failed to load products. Please try again.'
                : products.length === 0
                  ? searchQuery
                    ? `No products found for "${searchQuery}"`
                    : 'No products available.'
                  : `${products.length} product${products.length !== 1 ? 's' : ''} found`}
            </p>
          )}
        </div>

        <div className="mb-6 flex items-center justify-end">
          <label htmlFor="search-sort" className="mr-2 text-[13px] text-[var(--text)] opacity-60">
            Sort by
          </label>
          <select
            id="search-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm text-[var(--text-h)] outline-none focus:border-purple-400/50"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="text-[var(--text)] opacity-60">Loading products…</p>}

        <div className="grid [grid-template-columns:repeat(4,1fr)] gap-5 max-[1024px]:[grid-template-columns:repeat(3,1fr)] max-[720px]:[grid-template-columns:repeat(2,1fr)] max-[720px]:gap-3.5 max-[420px]:[grid-template-columns:1fr]">
          {products.map((product) => {
            const inWishlist = wishlistIds.has(product.id)
            const availableStock = parseInt(product.available_stock ?? product.stock ?? 0)
            return (
              <div
                key={product.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl transition-[box-shadow,transform,border-color] duration-250 hover:-translate-y-1 hover:border-purple-400/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.15),0_0_0_1px_rgba(192,132,252,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]"
              >
                <button
                  type="button"
                  className="flex aspect-[3/4] w-full cursor-pointer items-center justify-center border-b border-[var(--glass-border)] bg-purple-400/12 p-0"
                  onClick={() => navigate(`/product/${product.id}`)}
                  aria-label={`View details for ${product.name}`}
                >
                  <span className="text-[64px] font-bold text-purple-400 opacity-35 select-none">
                    {product.name[0]}
                  </span>
                </button>
                <div className="flex flex-1 flex-col gap-1 px-4 pt-3.5 pb-2.5">
                  <span className="text-sm font-semibold text-[var(--text-h)]">{product.name}</span>
                  {product.discounted_price != null ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] text-red-400 line-through opacity-70">
                        ${parseFloat(product.price).toFixed(2)}
                      </span>
                      <span className="text-[15px] font-bold text-purple-400">
                        ${parseFloat(product.discounted_price).toFixed(2)}
                        <span className="ml-1.5 text-[11px] font-semibold text-green-400">
                          -{product.discount_percent}%
                        </span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-[15px] font-bold text-purple-400">
                      ${parseFloat(product.price).toFixed(2)}
                    </span>
                  )}
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
                <div className="flex justify-end px-3 pb-3.5">
                  <button
                    type="button"
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
