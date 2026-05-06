import { useState, useEffect, useCallback } from 'react'
import { StarRating } from '../../components/icons'
import CatalogImage from '../../components/catalog/CatalogImage'
import Footer from '../home/components/Footer'
import Navbar from '../home/components/Navbar'
import API_BASE from '../../api'
import { getResolvedProductImages } from '../../lib/catalogAssets'

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

function AccordionRow({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between border-none bg-transparent py-4 text-left text-[15px] font-semibold text-[var(--text-h)] transition-colors hover:text-purple-400"
      >
        {title}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  )
}

export default function ProductPage({
  productId,
  onBack,
  onAddToCart,
  onAddToWishlist,
  onRemoveFromWishlist,
  wishlistItems = [],
  cartItems = [],
  onUpdateQuantity,
  isLoggedIn,
  userEmail,
  token,
  onNavigate,
  onRequireAuth,
  onLogout,
  cartCount,
  wishlistCount,
}) {
  const [product, setProduct] = useState(null)
  const [images, setImages] = useState([])
  const [activeImg, setActiveImg] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSize, setSelectedSize] = useState(null)
  const [sizeError, setSizeError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [reviews, setReviews] = useState([])
  const [avgRating, setAvgRating] = useState(null)
  const [totalRatings, setTotalRatings] = useState(0)
  const [reviewsLoading, setReviewsLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError('')
    setActiveImg(0)
    fetch(`${API_BASE}/api/products/${productId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Product not found')
        return r.json()
      })
      .then((data) => {
        setProduct(data.product)
        setImages(data.images || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [productId])

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}/reviews`)
      const data = await res.json()
      setReviews(data.reviews || [])
      setAvgRating(data.avgRating ?? null)
      setTotalRatings(data.totalRatings ?? 0)
    } catch {
      // ignore
    } finally {
      setReviewsLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  function handleAddToCart() {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setSizeError(true)
      return
    }
    setSizeError(false)
    onAddToCart && onAddToCart(product, selectedSize || '')
  }

  const ambientBg = (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        background:
          'linear-gradient(170deg, var(--bg) 0%, var(--bg-gradient-to) 25%, var(--accent-bg) 50%, var(--bg-gradient-to) 75%, var(--bg) 100%)',
      }}
      aria-hidden="true"
    />
  )

  const navbar = (
    <Navbar
      isLoggedIn={isLoggedIn}
      userEmail={userEmail}
      token={token}
      onNavigate={onNavigate}
      onRequireAuth={onRequireAuth}
      onLogout={onLogout}
      cartCount={cartCount}
      wishlistCount={wishlistCount}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  )

  if (loading) {
    return (
      <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
        {ambientBg}
        {navbar}
        <main className="relative z-[1] mx-auto box-border w-full max-w-[1280px] px-6 pt-12 pb-16">
          <p className="text-[var(--text)] opacity-60">Loading…</p>
        </main>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
        {ambientBg}
        {navbar}
        <main className="relative z-[1] mx-auto box-border w-full max-w-[1280px] px-6 pt-12 pb-16">
          <p className="text-red-400">{error || 'Product not found'}</p>
        </main>
      </div>
    )
  }

  const hue = CATEGORY_HUE[product.category] ?? 280
  const availableStock = parseInt(product.available_stock ?? product.stock ?? 0)
  const outOfStock = availableStock === 0
  const inWishlist = wishlistItems.some((i) => i.id === product.id)
  const cartItem = cartItems.find(
    (i) => i.id === product.id && (i.size || '') === (selectedSize || ''),
  )
  const currentQty = cartItem?.quantity ?? 0
  const galleryImages = getResolvedProductImages(product, images)
  const avgRatingRounded = avgRating ? Math.round(parseFloat(avgRating)) : null

  const hasModelInfo =
    product.model_height ||
    product.model_chest ||
    product.model_waist ||
    product.model_hips ||
    product.model_size

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
      {ambientBg}
      {navbar}

      <main className="relative z-[1] mx-auto box-border w-full max-w-[1280px] px-6 pt-6 pb-20">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-2.5 py-1.5 text-sm text-[var(--text)] transition-colors hover:bg-purple-400/12 hover:text-purple-400"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
        {/* ── Top section: image gallery + info ── */}
        <div className="grid gap-10 max-[720px]:grid-cols-1 lg:grid-cols-[5fr_7fr]">
          {/* Image gallery */}
          <div className="flex flex-col gap-3">
            {/* Main image */}
            <div className="relative overflow-hidden rounded-2xl border border-[var(--glass-border)] shadow-[var(--shadow)]">
              <CatalogImage
                src={galleryImages[activeImg]?.url}
                alt={galleryImages[activeImg]?.alt || product.name}
                loading="eager"
                containerClassName="aspect-[3/4] w-full"
                imageClassName="object-contain"
                placeholder={
                  <span
                    className="text-[120px] font-bold opacity-30 select-none"
                    style={{ color: `hsl(${hue},70%,var(--cat-text-l,70%))` }}
                  >
                    {product.name[0]}
                  </span>
                }
                style={{
                  background: `linear-gradient(160deg, hsl(${hue},35%,var(--cat-bg-l,10%)) 0%, hsl(${hue},50%,var(--cat-bg-l2,20%)) 100%)`,
                }}
              />
              {/* Arrow navigation */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImg((i) => (i - 1 + galleryImages.length) % galleryImages.length)
                    }
                    className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-[var(--card-bg)]/80 text-[var(--text-h)] shadow-md backdrop-blur-sm transition-colors hover:bg-purple-400/20 hover:text-purple-400"
                    aria-label="Previous image"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImg((i) => (i + 1) % galleryImages.length)}
                    className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-[var(--card-bg)]/80 text-[var(--text-h)] shadow-md backdrop-blur-sm transition-colors hover:bg-purple-400/20 hover:text-purple-400"
                    aria-label="Next image"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </>
              )}
            </div>
            {/* Dot indicators — outside the image so they're always visible */}
            {galleryImages.length > 1 && (
              <div className="flex justify-center gap-2">
                {galleryImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`cursor-pointer rounded-full border-none transition-all ${i === activeImg ? 'h-2 w-6 bg-purple-400' : 'h-2 w-2 bg-[var(--border)] hover:bg-purple-400/50'}`}
                    aria-label={`View image ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Thumbnail strip */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {galleryImages.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 p-0 transition-all ${i === activeImg ? 'border-purple-400 shadow-[0_0_0_1px_rgba(192,132,252,0.5)]' : 'border-[var(--glass-border)] opacity-60 hover:opacity-90'}`}
                    style={{ width: 72, height: 96 }}
                    aria-label={img.alt || `Image ${i + 1}`}
                  >
                    <CatalogImage
                      src={img.url}
                      alt={img.alt || `View ${i + 1}`}
                      containerClassName="h-full w-full"
                      imageClassName="object-contain"
                      placeholder={
                        <span
                          className="text-2xl font-bold opacity-30 select-none"
                          style={{ color: `hsl(${hue},70%,var(--cat-text-l,70%))` }}
                        >
                          {product.name[0]}
                        </span>
                      }
                      style={{
                        background: `linear-gradient(160deg, hsl(${hue},35%,var(--cat-bg-l,10%)) 0%, hsl(${hue},50%,var(--cat-bg-l2,20%)) 100%)`,
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
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

              {!reviewsLoading && (
                <div className="mt-2 flex items-center gap-2">
                  <StarRating rating={avgRatingRounded} />
                  <span className="text-[13px] text-[var(--text)] opacity-70">
                    {avgRating
                      ? `${avgRating} (${totalRatings} review${totalRatings !== 1 ? 's' : ''})`
                      : 'No reviews'}
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
                      type="button"
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

            {/* Product details */}
            {(product.description ||
              product.material ||
              product.country_of_origin ||
              hasModelInfo) && (
              <div className="space-y-4 border-t border-[var(--border)] pt-4">
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
                {hasModelInfo && (
                  <div>
                    <p className="m-0 mb-1 text-[11px] font-bold tracking-[3px] text-purple-400 uppercase">
                      Fit &amp; Sizing
                    </p>
                    <p className="m-0 text-[14px] leading-relaxed text-[var(--text-h)]">
                      {[
                        product.model_size && `The model wears size ${product.model_size}`,
                        product.model_height && `height ${product.model_height}`,
                        product.model_chest && `chest ${product.model_chest}`,
                        product.model_waist && `waist ${product.model_waist}`,
                        product.model_hips && `hips ${product.model_hips}`,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                      .
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Add to cart + wishlist */}
            <div className="flex gap-3">
              {currentQty > 0 ? (
                <div className="flex flex-1 items-center justify-between rounded-xl border border-purple-400 bg-purple-400/10 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(product.id, selectedSize || '', currentQty - 1)}
                    className="flex cursor-pointer items-center justify-center border-none bg-transparent text-xl leading-none text-[var(--text-h)] transition-colors hover:text-purple-400"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="text-[14px] font-semibold text-[var(--text-h)]">
                    {currentQty} in cart
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(product.id, selectedSize || '', currentQty + 1)}
                    className="flex cursor-pointer items-center justify-center border-none bg-transparent text-xl leading-none text-[var(--text-h)] transition-colors hover:text-purple-400"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={outOfStock ? undefined : handleAddToCart}
                  className={
                    outOfStock
                      ? 'flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-transparent px-5 py-3 text-[14px] font-semibold text-[var(--text)] opacity-40'
                      : 'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-purple-400 px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:opacity-88'
                  }
                >
                  <CartIcon />
                  {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
              )}
              <button
                type="button"
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

        {/* ── Reviews ── */}
        <section className="mt-12 border-t border-[var(--border)] pt-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="m-0 text-[22px] font-bold tracking-[-0.5px] text-[var(--text-h)]">
              Customer Reviews
              {totalRatings > 0 && (
                <span className="ml-2 text-[18px] font-normal text-[var(--text)] opacity-60">
                  ({totalRatings})
                </span>
              )}
            </h2>
            {!reviewsLoading && (
              <div className="flex items-center gap-2">
                {avgRating && (
                  <span className="text-[28px] font-bold text-[var(--text-h)]">{avgRating}</span>
                )}
                <StarRating rating={avgRatingRounded} />
              </div>
            )}
          </div>

          {reviewsLoading ? (
            <p className="text-[13px] text-[var(--text)] opacity-60">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="text-[14px] text-[var(--text)] opacity-50">No reviews yet.</p>
          ) : (
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <StarRating rating={r.rating} />
                    <span className="text-[11px] text-[var(--text)] opacity-50">
                      {new Date(r.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="mb-2 text-[12px] font-semibold text-[var(--text)] opacity-60">
                    {r.author_name}
                  </p>
                  {r.content && (
                    <p className="m-0 text-[14px] leading-relaxed text-[var(--text-h)]">
                      {r.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Info accordion ── */}
        <div className="mt-12 divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {[
            {
              title: 'Shipping & Delivery',
              content: (
                <>
                  <p className="m-0 mb-2 text-[14px] leading-relaxed text-[var(--text-h)]">
                    Standard delivery in <strong>3–5 business days</strong>. Express options
                    available at checkout.
                  </p>
                  <p className="m-0 text-[14px] leading-relaxed text-[var(--text-h)]">
                    Free shipping on orders over <strong>$50</strong>. Orders are dispatched within
                    1 business day.
                  </p>
                </>
              ),
            },
            {
              title: 'Installments',
              content: (
                <p className="m-0 text-[14px] leading-relaxed text-[var(--text-h)]">
                  Split your purchase into <strong>3, 6, or 12 interest-free installments</strong>{' '}
                  at checkout. Available for orders over $30. No hidden fees — the total you see is
                  the total you pay.
                </p>
              ),
            },
            {
              title: 'Returns & Refunds',
              content: (
                <>
                  <p className="m-0 mb-2 text-[14px] leading-relaxed text-[var(--text-h)]">
                    Free returns within <strong>30 days</strong> of delivery. Items must be unworn,
                    unwashed, and in original packaging.
                  </p>
                  <p className="m-0 text-[14px] leading-relaxed text-[var(--text-h)]">
                    Refunds are processed within 5–7 business days after we receive the return.
                  </p>
                </>
              ),
            },
          ].map(({ title, content }) => (
            <AccordionRow key={title} title={title}>
              {content}
            </AccordionRow>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}

