import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import API_BASE from '../../api'
import CatalogImage from '../../components/catalog/CatalogImage'
import { getProductImageUrl } from '../../lib/catalogAssets'
import { TIMELINE_STEPS, STATUS_INDEX, mapStatus, nameHue } from './orderHelpers'

/* ── Icons ───────────────────────────────────────────────── */

export function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function ChevronDownIcon() {
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

/* ── Refund status badge ─────────────────────────────────── */

export function RefundBadge({ status, refundAmount }) {
  const base = 'inline-block text-[10px] font-bold tracking-[0.5px] px-2 py-0.5 rounded-full ml-2'
  const parsed = refundAmount != null ? parseFloat(refundAmount) : null
  const amount = parsed != null && !Number.isNaN(parsed) ? ` · $${parsed.toFixed(2)}` : ''
  switch (status) {
    case 'pending':
      return (
        <span className={`${base} bg-amber-500/15 text-amber-600`}>Refund Pending{amount}</span>
      )
    case 'approved':
      return (
        <span className={`${base} bg-green-500/15 text-green-600`}>Refund Approved{amount}</span>
      )
    case 'rejected':
      return <span className={`${base} bg-red-500/15 text-red-500`}>Refund Rejected{amount}</span>
    default:
      return null
  }
}

/* ── Refund action button ────────────────────────────────── */

export function RefundActionButton({ item, orderCreatedAt, orderStatus, token, onRefundChange }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const daysOld = (Date.now() - new Date(orderCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
  const isWithin30Days = daysOld <= 30
  const isDelivered = orderStatus === 'delivered'
  const refundStatus = item.refund?.status ?? null

  if (!isDelivered || !isWithin30Days) return null
  if (refundStatus === 'approved' || refundStatus === 'rejected') return null

  const isPending = refundStatus === 'pending'

  async function handleRequest() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_item_id: item.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to request refund')
      }
      onRefundChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/refunds/${item.refund.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel refund')
      }
      onRefundChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {!isPending && confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text)]">Request a refund?</span>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              handleRequest()
              setConfirming(false)
            }}
            className="cursor-pointer rounded-[7px] border border-red-400/40 bg-transparent px-3 py-1.5 text-xs leading-none font-semibold text-red-400 transition-colors hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Yes'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setConfirming(false)
              setError(null)
            }}
            className="cursor-pointer rounded-[7px] border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs leading-none font-semibold text-[var(--text)] transition-colors hover:border-purple-400/40 hover:text-purple-400 disabled:opacity-50"
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={isPending ? handleCancel : () => setConfirming(true)}
          className={`cursor-pointer rounded-[7px] border px-3 py-1.5 text-xs leading-none font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isPending
              ? 'border-red-400/40 bg-transparent text-red-400 hover:border-red-400 hover:bg-red-400/10'
              : 'border-[var(--border)] bg-transparent text-[var(--text)] hover:border-purple-400 hover:text-purple-400'
          }`}
        >
          {loading ? 'Loading…' : isPending ? 'Cancel Refund Request' : 'Request Refund'}
        </button>
      )}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  )
}

/* ── Review components ───────────────────────────────────── */

export function StarSelector({ value, onChange }) {
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

export function ReviewModal({ item, token, onClose, onSuccess }) {
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.focus()
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rating) {
      setError('Please select a star rating.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/products/${item.product_id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, content: content.trim() || null, anonymous }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to submit review')
      setSuccess(true)
      onSuccess && onSuccess(item.product_id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl focus:outline-none"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="review-modal-title" className="m-0 text-[18px] font-bold text-[var(--text-h)]">
              Review Product
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--text)] opacity-60">{item.product_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border-none bg-transparent p-1.5 text-[var(--text)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text-h)]"
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

        {success ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-[14px] text-emerald-400">
            Thank you for your review! Your rating is live. If you left a comment, it will appear
            after a quick review.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="mb-2 text-[13px] font-semibold text-[var(--text)]">Your Rating</p>
              <StarSelector value={rating} onChange={setRating} />
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-[var(--text)]">
                Comment{' '}
                {rating ? (
                  <span className="font-normal opacity-50">(optional)</span>
                ) : (
                  <span className="font-normal italic opacity-40">— select a rating first</span>
                )}
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={!rating}
                placeholder="Share what you liked, how it fits, or anything helpful for others…"
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[14px] text-[var(--text-h)] transition-opacity placeholder:text-[var(--text)]/40 focus:border-purple-400/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-30"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-semibold text-[var(--text)]">Display name</span>
              <input
                type="checkbox"
                checked={!anonymous}
                onChange={(e) => setAnonymous(!e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-purple-400"
              />
            </div>

            {error && <p className="text-[13px] text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full cursor-pointer rounded-xl border-none bg-purple-400 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}

export function WriteReviewButton({
  item,
  orderStatus,
  token,
  isReviewed,
  onReviewed,
  onNavigateReviews,
}) {
  const [open, setOpen] = useState(false)

  if (orderStatus !== 'delivered') return null

  // Show "View Review" only when the modal is closed — keep modal mounted until user dismisses
  // so the success message is visible before switching states.
  if (isReviewed && !open) {
    return (
      <button
        type="button"
        onClick={onNavigateReviews}
        className="flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs leading-none font-semibold text-emerald-400 transition-colors hover:border-emerald-500/70 hover:bg-emerald-500/20"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        View Review
      </button>
    )
  }

  return (
    <>
      {!isReviewed && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer rounded-[7px] border border-purple-400/40 bg-purple-400/10 px-3 py-1.5 text-xs leading-none font-semibold text-purple-400 transition-colors hover:border-purple-400/70 hover:bg-purple-400/20"
        >
          Write a Review
        </button>
      )}
      {open && (
        <ReviewModal
          item={item}
          token={token}
          onClose={() => setOpen(false)}
          onSuccess={onReviewed}
        />
      )}
    </>
  )
}

/* ── Sub-components ──────────────────────────────────────── */

export function DeliveryTimeline({ dbStatus }) {
  const uiStatus = mapStatus(dbStatus)
  const activeIdx = STATUS_INDEX[uiStatus] ?? 0
  return (
    <div className="mb-6 flex items-start overflow-x-auto pt-2 pb-1">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < activeIdx
        const current = i === activeIdx
        return (
          <div key={step.key} className="relative flex min-w-[80px] flex-1 flex-col items-center">
            {i > 0 && (
              <div
                className={`absolute top-[13px] right-1/2 z-0 h-0.5 w-full ${i <= activeIdx ? 'bg-purple-400' : 'bg-[var(--border)]'}`}
              />
            )}
            <div
              className={`relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
                done
                  ? 'border-purple-400 bg-purple-400 text-white'
                  : current
                    ? 'border-purple-400 bg-[var(--bg)] text-[var(--text)] shadow-[0_0_0_4px_rgba(192,132,252,0.12)]'
                    : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text)]'
              }`}
            >
              {done ? (
                <CheckIcon />
              ) : current ? (
                <span className="block h-2.5 w-2.5 rounded-full bg-purple-400" />
              ) : null}
            </div>
            <span
              className={`mt-2 text-center text-[11px] leading-[1.3] font-medium ${done || current ? 'font-semibold text-[var(--text-h)]' : 'text-[var(--text)]'}`}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function OrderItems({
  items,
  orderCreatedAt,
  orderStatus,
  token,
  onRefundChange,
  reviewedIds,
  onReviewed,
  onNavigateReviews,
}) {
  return (
    <ul className="m-0 mb-4 flex list-none flex-col gap-3 p-0">
      {items.map((item) => {
        const hue = nameHue(item.product_name)
        const lineTotal = parseFloat(item.price) * item.quantity
        return (
          <li key={item.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-3.5">
              <CatalogImage
                src={getProductImageUrl({
                  name: item.product_name,
                  category: item.product_category,
                })}
                alt={item.product_name}
                containerClassName="h-[64px] w-[64px] shrink-0 rounded-lg border border-[var(--border)]"
                imageClassName="object-cover"
                placeholder={
                  <span
                    style={{
                      color: `hsl(${hue},70%,var(--cat-text-l,70%))`,
                      fontSize: 22,
                      fontWeight: 700,
                      opacity: 0.5,
                    }}
                  >
                    {item.product_name[0]}
                  </span>
                }
                style={{
                  background: `linear-gradient(160deg, hsl(${hue},35%,var(--cat-bg-l,12%)) 0%, hsl(${hue},45%,var(--cat-bg-l2,20%)) 100%)`,
                }}
              />
              <div className="flex flex-1 flex-col gap-2">
                <span className="flex items-center text-sm font-semibold text-[var(--text-h)]">
                  {item.product_name}
                  {item.refund && (
                    <RefundBadge
                      status={item.refund.status}
                      refundAmount={item.refund.refund_amount}
                    />
                  )}
                </span>
                <span className="text-xs text-[var(--text)]">
                  {item.size ? `Size ${item.size} · ` : ''}Qty {item.quantity}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="shrink-0 text-sm font-bold text-[var(--text-h)]">
                  ${lineTotal.toFixed(2)}
                </span>
                {token && (
                  <div className="flex items-center gap-1.5">
                    <RefundActionButton
                      item={item}
                      orderCreatedAt={orderCreatedAt}
                      orderStatus={orderStatus}
                      token={token}
                      onRefundChange={onRefundChange}
                    />
                    <WriteReviewButton
                      item={item}
                      orderStatus={orderStatus}
                      token={token}
                      isReviewed={reviewedIds?.has(item.product_id)}
                      onReviewed={onReviewed}
                      onNavigateReviews={onNavigateReviews}
                    />
                  </div>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
