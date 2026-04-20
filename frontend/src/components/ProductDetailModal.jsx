import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../api'
import { StarRating } from './icons'

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
            width="24"
            height="24"
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

export default function ProductDetailModal({ product, token, onClose }) {
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/products/${product.id}/reviews`)
      const data = await res.json()
      setReviews(data.reviews || [])
    } catch {
      // ignore
    } finally {
      setReviewsLoading(false)
    }
  }, [product.id])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rating) {
      setSubmitError('Please select a rating')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`${API_BASE}/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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

  const availableStock = parseInt(product.available_stock ?? product.stock ?? 0)
  const avgRating =
    reviews.length > 0
      ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
      : null

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div className="min-w-0 flex-1">
            <p className="m-0 mb-1 text-[11px] font-bold tracking-[4px] text-purple-400 uppercase">
              {product.category || 'Product'}
            </p>
            <h2 className="m-0 text-[22px] leading-tight font-bold tracking-[-0.5px] text-[var(--text-h)]">
              {product.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {product.discounted_price != null ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-[18px] font-bold text-purple-400">
                    ${parseFloat(product.discounted_price).toFixed(2)}
                  </span>
                  <span className="text-[14px] text-red-400 line-through opacity-70">
                    ${parseFloat(product.price).toFixed(2)}
                  </span>
                  <span className="text-[11px] font-semibold text-green-400">
                    -{product.discount_percent}%
                  </span>
                </div>
              ) : (
                <span className="text-[18px] font-bold text-purple-400">
                  ${parseFloat(product.price).toFixed(2)}
                </span>
              )}
              {avgRating != null && <StarRating rating={avgRating} />}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[var(--text)] transition-colors hover:bg-purple-400/12 hover:text-purple-400"
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {product.description && (
            <div>
              <h3 className="m-0 mb-2 text-[13px] font-semibold tracking-wider text-[var(--text)] uppercase">
                Description
              </h3>
              <p className="m-0 text-[14px] leading-relaxed text-[var(--text-h)]">
                {product.description}
              </p>
            </div>
          )}

          <p
            className={
              availableStock < 10
                ? 'text-[13px] font-semibold text-red-400'
                : 'text-[13px] text-[var(--text)] opacity-60'
            }
          >
            {availableStock === 0
              ? 'Out of stock'
              : availableStock < 10
                ? `Only ${availableStock} left in stock`
                : `${availableStock} in stock`}
          </p>

          {/* Reviews list */}
          <div>
            <h3 className="m-0 mb-3 text-[13px] font-semibold tracking-wider text-[var(--text)] uppercase">
              Customer Reviews{reviews.length > 0 ? ` (${reviews.length})` : ''}
            </h3>
            {reviewsLoading ? (
              <p className="text-[13px] text-[var(--text)] opacity-60">Loading reviews…</p>
            ) : reviews.length === 0 ? (
              <p className="text-[13px] text-[var(--text)] opacity-50">
                No reviews yet. Be the first!
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <StarRating rating={r.rating} />
                      <span className="text-[11px] text-[var(--text)] opacity-50">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.content && (
                      <p className="m-0 text-[13px] leading-relaxed text-[var(--text-h)]">
                        {r.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit review */}
          <div>
            <h3 className="m-0 mb-3 text-[13px] font-semibold tracking-wider text-[var(--text)] uppercase">
              Write a Review
            </h3>
            {!token ? (
              <p className="text-[13px] text-[var(--text)] opacity-60">
                <a href="/login" className="text-purple-400 underline">
                  Log in
                </a>{' '}
                to write a review.
              </p>
            ) : submitSuccess ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-400">
                Review submitted — it will appear once approved by our team.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <StarSelector value={rating} onChange={setRating} />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your experience (optional)…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[13px] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus:border-purple-400/50 focus:outline-none"
                />
                {submitError && <p className="text-[12px] text-red-400">{submitError}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer rounded-xl border-none bg-purple-400 px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
