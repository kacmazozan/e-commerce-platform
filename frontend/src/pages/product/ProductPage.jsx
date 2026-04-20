import { useState, useEffect, useCallback } from 'react'
import { StarRating } from '../../components/icons'
import API_BASE from '../../api'

const CATEGORY_HUE = {
  "Women's Clothing": 280,
  "Men's Clothing": 210,
  Outerwear: 200,
  Footwear: 160,
  Accessories: 40,
  Activewear: 340,
  Formal: 260,
  'Kids & Baby': 20,
}

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

function HeartIcon({ filled }) {
  return (
    <svg
      width="18"
      height="18"
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

function CartIcon() {
  return (
    <svg
      width="18"
      height="18"
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

function StarSelector({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="cursor-pointer border-none bg-transparent p-0.5 text-amber-400 transition-transform hover:scale-110"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          aria-label={`Rate ${n} stars`}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill={active >= n ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={active >= n ? '' : 'opacity-30'}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export default function ProductPage({
  productId,
  onBack,
  onAddToCart,
  onRemoveFromCart,
  onAddToWishlist,
  onRemoveFromWishlist,
  cartItems = [],
  wishlistItems = [],
  token = null,
}) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSize, setSelectedSize] = useState(null)
  const [sizeError, setSizeError] = useState(false)

  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`${API_BASE}/api/products/${productId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Product not found')
        return r.json()
      })
      .then((data) => setProduct(data.product))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [productId])

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}/reviews`)
      const data = await res.json()
      setReviews(data.reviews || [])
    } catch {
      // ignore
    } finally {
      setReviewsLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  async function handleSubmitReview(e) {
    e.preventDefault()
    if (!rating) {
      setSubmitError('Please select a rating')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit review')
      setSubmitSuccess(true)
      setRating(0)
      setContent('')
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleAddToCart() {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setSizeError(true)
      return
    }
    setSizeError(false)
    onAddToCart && onAddToCart(product)
  }

  if (loading) {
    return (
      <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
        <Header onBack={onBack} />
        <main className="mx-auto box-border w-full max-w-[1280px] px-6 pt-12 pb-16">
          <p className="text-[var(--text)] opacity-60">Loading…</p>
        </main>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
        <Header onBack={onBack} />
        <main className="mx-auto box-border w-full max-w-[1280px] px-6 pt-12 pb-16">
          <p className="text-red-400">{error || 'Product not found'}</p>
        </main>
      </div>
    )
  }

  const hue = CATEGORY_HUE[product.category] ?? 280
  const availableStock = parseInt(product.available_stock ?? product.stock ?? 0)
  const outOfStock = availableStock === 0
  const inCart = cartItems.some((i) => i.id === product.id)
  const inWishlist = wishlistItems.some((i) => i.id === product.id)
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null
  const avgRatingRounded = avgRating ? Math.round(parseFloat(avgRating)) : null

  const hasModelInfo =
    product.model_height ||
    product.model_chest ||
    product.model_waist ||
    product.model_hips ||
    product.model_size

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
      <Header onBack={onBack} />

      <main className="mx-auto box-border w-full max-w-[1280px] px-6 pt-10 pb-20">
        {/* ── Top section: image + info ── */}
        <div className="grid gap-10 max-[720px]:grid-cols-1 lg:grid-cols-[5fr_7fr]">
          {/* Product image */}
          <div
            className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl border border-[var(--glass-border)] shadow-[var(--shadow)]"
            style={{
              background: `linear-gradient(160deg, hsl(${hue},35%,var(--cat-bg-l,10%)) 0%, hsl(${hue},50%,var(--cat-bg-l2,20%)) 100%)`,
            }}
          >
            <span
              className="text-[120px] font-bold opacity-30 select-none"
              style={{ color: `hsl(${hue},70%,var(--cat-text-l,70%))` }}
            >
              {product.name[0]}
            </span>
          </div>

          {/* Product info */}
          <div className="flex flex-col gap-5">
            <div>
              {product.category && (
                <p className="m-0 mb-2 text-[11px] font-bold tracking-[4px] text-purple-400 uppercase">
                  {product.category}
                </p>
              )}
              <h1 className="m-0 text-[32px] leading-tight font-extrabold tracking-[-1px] text-[var(--text-h)] max-[720px]:text-[26px]">
                {product.name}
              </h1>

              {avgRating && (
                <div className="mt-2 flex items-center gap-2">
                  <StarRating rating={avgRatingRounded} />
                  <span className="text-[13px] text-[var(--text)] opacity-70">
                    {avgRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                  </span>
                </div>
              )}
            </div>

            {/* Price */}
            <div>
              {product.discounted_price != null ? (
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-[28px] font-bold text-purple-400">
                    ${parseFloat(product.discounted_price).toFixed(2)}
                  </span>
                  <span className="text-[18px] text-red-400 line-through opacity-70">
                    ${parseFloat(product.price).toFixed(2)}
                  </span>
                  <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[12px] font-bold text-green-400">
                    -{product.discount_percent}% OFF
                  </span>
                </div>
              ) : (
                <span className="text-[28px] font-bold text-purple-400">
                  ${parseFloat(product.price).toFixed(2)}
                </span>
              )}
              <p
                className={
                  availableStock === 0
                    ? 'mt-1 text-[13px] font-semibold text-red-400'
                    : availableStock < 10
                      ? 'mt-1 text-[13px] font-semibold text-amber-400'
                      : 'mt-1 text-[13px] text-[var(--text)] opacity-50'
                }
              >
                {availableStock === 0
                  ? 'Out of stock'
                  : availableStock < 10
                    ? `Only ${availableStock} left`
                    : `${availableStock} in stock`}
              </p>
            </div>

            {/* Size selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-[var(--text-h)]">
                  Size{' '}
                  {selectedSize && (
                    <span className="font-bold text-purple-400">— {selectedSize}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => {
                        setSelectedSize(sz)
                        setSizeError(false)
                      }}
                      className={
                        selectedSize === sz
                          ? 'cursor-pointer rounded-lg border border-purple-400 bg-purple-400/20 px-4 py-2 text-[13px] font-semibold text-purple-400 transition-colors'
                          : 'cursor-pointer rounded-lg border border-[var(--border)] bg-transparent px-4 py-2 text-[13px] font-semibold text-[var(--text-h)] transition-colors hover:border-purple-400/50 hover:text-purple-400'
                      }
                    >
                      {sz}
                    </button>
                  ))}
                </div>
                {sizeError && (
                  <p className="mt-1.5 text-[12px] text-red-400">Please select a size</p>
                )}
              </div>
            )}

            {/* Add to cart + wishlist */}
            <div className="flex gap-3">
              <button
                disabled={outOfStock}
                onClick={
                  outOfStock
                    ? undefined
                    : inCart
                      ? () => onRemoveFromCart && onRemoveFromCart(product.id)
                      : handleAddToCart
                }
                className={
                  outOfStock
                    ? 'flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-transparent px-5 py-3 text-[14px] font-semibold text-[var(--text)] opacity-40'
                    : inCart
                      ? 'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-purple-400 bg-transparent px-5 py-3 text-[14px] font-semibold text-purple-400 transition-opacity hover:opacity-80'
                      : 'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-purple-400 px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-88'
                }
              >
                <CartIcon />
                {outOfStock ? 'Out of Stock' : inCart ? 'Remove from Cart' : 'Add to Cart'}
              </button>
              <button
                onClick={() =>
                  inWishlist
                    ? onRemoveFromWishlist && onRemoveFromWishlist(product.id)
                    : onAddToWishlist && onAddToWishlist(product)
                }
                className={
                  inWishlist
                    ? 'flex h-[50px] w-[50px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-purple-400 bg-purple-400/12 text-purple-400 transition-colors'
                    : 'flex h-[50px] w-[50px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-transparent text-[var(--text)] transition-colors hover:border-purple-400 hover:text-purple-400'
                }
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <HeartIcon filled={inWishlist} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Product details ── */}
        {(product.description || product.material || product.country_of_origin || hasModelInfo) && (
          <section className="mt-12 border-t border-[var(--border)] pt-10">
            <h2 className="m-0 mb-6 text-[22px] font-bold tracking-[-0.5px] text-[var(--text-h)]">
              Product Details
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              {(product.description || product.material || product.country_of_origin) && (
                <div className="space-y-4">
                  {product.description && (
                    <div>
                      <p className="m-0 mb-1 text-[11px] font-bold tracking-[3px] text-purple-400 uppercase">
                        Description
                      </p>
                      <p className="m-0 text-[14px] leading-relaxed text-[var(--text-h)]">
                        {product.description}
                      </p>
                    </div>
                  )}
                  {product.material && (
                    <div>
                      <p className="m-0 mb-1 text-[11px] font-bold tracking-[3px] text-purple-400 uppercase">
                        Material
                      </p>
                      <p className="m-0 text-[14px] text-[var(--text-h)]">{product.material}</p>
                    </div>
                  )}
                  {product.country_of_origin && (
                    <div>
                      <p className="m-0 mb-1 text-[11px] font-bold tracking-[3px] text-purple-400 uppercase">
                        Country of Origin
                      </p>
                      <p className="m-0 text-[14px] text-[var(--text-h)]">
                        {product.country_of_origin}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {hasModelInfo && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
                  <p className="m-0 mb-4 text-[11px] font-bold tracking-[3px] text-purple-400 uppercase">
                    Fit & Sizing
                  </p>
                  {product.model_size && (
                    <p className="m-0 mb-3 text-[13px] leading-relaxed text-[var(--text-h)]">
                      The model is wearing size{' '}
                      <span className="font-bold text-purple-400">{product.model_size}</span>.
                    </p>
                  )}
                  <div className="space-y-2">
                    {product.model_height && (
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                        <span className="text-[13px] text-[var(--text)]">Height</span>
                        <span className="text-[13px] font-semibold text-[var(--text-h)]">
                          {product.model_height}
                        </span>
                      </div>
                    )}
                    {product.model_chest && (
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                        <span className="text-[13px] text-[var(--text)]">Chest</span>
                        <span className="text-[13px] font-semibold text-[var(--text-h)]">
                          {product.model_chest}
                        </span>
                      </div>
                    )}
                    {product.model_waist && (
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                        <span className="text-[13px] text-[var(--text)]">Waist</span>
                        <span className="text-[13px] font-semibold text-[var(--text-h)]">
                          {product.model_waist}
                        </span>
                      </div>
                    )}
                    {product.model_hips && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[var(--text)]">Hips</span>
                        <span className="text-[13px] font-semibold text-[var(--text-h)]">
                          {product.model_hips}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Reviews ── */}
        <section className="mt-12 border-t border-[var(--border)] pt-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="m-0 text-[22px] font-bold tracking-[-0.5px] text-[var(--text-h)]">
              Customer Reviews
              {reviews.length > 0 && (
                <span className="ml-2 text-[18px] font-normal text-[var(--text)] opacity-60">
                  ({reviews.length})
                </span>
              )}
            </h2>
            {avgRating && (
              <div className="flex items-center gap-2">
                <span className="text-[28px] font-bold text-[var(--text-h)]">{avgRating}</span>
                <StarRating rating={avgRatingRounded} />
              </div>
            )}
          </div>

          {reviewsLoading ? (
            <p className="text-[13px] text-[var(--text)] opacity-60">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="text-[14px] text-[var(--text)] opacity-50">
              No reviews yet. Be the first to share your experience!
            </p>
          ) : (
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <StarRating rating={r.rating} />
                    <span className="text-[11px] text-[var(--text)] opacity-50">
                      {new Date(r.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {r.content && (
                    <p className="m-0 text-[14px] leading-relaxed text-[var(--text-h)]">
                      {r.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Write a review */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
            <h3 className="m-0 mb-4 text-[16px] font-semibold text-[var(--text-h)]">
              Write a Review
            </h3>
            {!token ? (
              <p className="text-[14px] text-[var(--text)] opacity-70">
                <a href="/login" className="text-purple-400 underline">
                  Log in
                </a>{' '}
                to share your experience with this product.
              </p>
            ) : submitSuccess ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-[14px] text-emerald-400">
                Thank you! Your review has been submitted and will appear once approved.
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-[var(--text)]">Your Rating</p>
                  <StarSelector value={rating} onChange={setRating} />
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-[var(--text)]">
                    Your Review <span className="font-normal opacity-50">(optional)</span>
                  </p>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share what you liked, how it fits, or anything helpful for others…"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[14px] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus:border-purple-400/50 focus:outline-none"
                  />
                </div>
                {submitError && <p className="text-[13px] text-red-400">{submitError}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer rounded-xl border-none bg-purple-400 px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function Header({ onBack }) {
  return (
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
  )
}
