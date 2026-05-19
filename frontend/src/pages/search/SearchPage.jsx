import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CatalogImage from '../../components/catalog/CatalogImage'
import API_BASE from '../../api'
import { SORT_OPTIONS } from '../../constants/sortOptions'
import { getProductImageUrl } from '../../lib/catalogAssets'

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
  onAddToWishlist,
  onRemoveFromWishlist,
  wishlistItems = [],
}) {
  const [products, setProducts] = useState([])
  const [loadedKey, setLoadedKey] = useState(null)
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
    const requestKey = `${searchQuery}::${sort}`

    fetch(`${API_BASE}/api/products/search?q=${encodeURIComponent(searchQuery)}&sort=${sort}`)
      .then((r) => {
        if (!r.ok) throw new Error('Server error')
        return r.json()
      })
      .then((data) => {
        if (!cancelled) {
          setProducts(data.products ?? [])
          setLoadedKey(requestKey)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([])
          setError(true)
          setLoadedKey(requestKey)
        }
      })
    return () => {
      cancelled = true
    }
  }, [searchQuery, sort])

  const wishlistIds = new Set(wishlistItems.map((i) => i.id))

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
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
                  <CatalogImage
                    src={getProductImageUrl(product)}
                    alt={product.name}
                    containerClassName="h-full w-full"
                    imageClassName="object-contain p-3"
                    placeholder={
                      <span className="text-[64px] font-bold text-purple-400 opacity-35 select-none">
                        {product.name[0]}
                      </span>
                    }
                    style={{ background: 'rgba(192,132,252,0.12)' }}
                  />
                </button>
                <div className="flex flex-1 flex-col gap-1 px-4 pt-3.5 pb-2.5">
                  <span className="text-sm font-semibold text-[var(--text-h)]">{product.name}</span>
                  <span className="text-[11px] text-[var(--text)] opacity-50">
                    #{product.id}
                    {(product.model || product.serial_number) && (
                      <> · {product.model || product.serial_number}</>
                    )}
                  </span>
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
                      availableStock === 0
                        ? 'text-[11px] font-semibold text-red-400'
                        : availableStock <= 10
                          ? 'text-[11px] font-semibold text-amber-400'
                          : 'text-[11px] font-semibold text-green-400'
                    }
                  >
                    {availableStock === 0
                      ? 'Out of stock'
                      : availableStock <= 10
                        ? `Only ${availableStock} left`
                        : 'In stock'}
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
