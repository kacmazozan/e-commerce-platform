import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import API_BASE from '../../api'

/* ── Status mapping ──────────────────────────────────────── */

const TIMELINE_STEPS = [
  { key: 'placed', label: 'Order Placed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
]

const STATUS_INDEX = { placed: 0, processing: 1, shipped: 2, delivered: 3 }

function mapStatus(dbStatus) {
  if (dbStatus === 'pending') return 'placed'
  return dbStatus
}

function isActive(order) {
  return order.status !== 'delivered' && order.status !== 'cancelled'
}

function isCancellable(order) {
  return order.status === 'pending' || order.status === 'processing'
}

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function nameHue(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}

/* ── Icons ───────────────────────────────────────────────── */

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

function CheckIcon() {
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

function ChevronDownIcon() {
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

/* ── Status pill ─────────────────────────────────────────── */

function statusPillClass(status) {
  const base = 'inline-block text-[11px] font-bold tracking-[0.5px] px-2.5 py-1 rounded-full'
  switch (status) {
    case 'placed':
    case 'pending':
      return `${base} bg-slate-500/15 text-slate-500`
    case 'processing':
      return `${base} bg-amber-500/15 text-amber-600`
    case 'shipped':
      return `${base} bg-blue-500/15 text-blue-500`
    case 'delivered':
      return `${base} bg-green-500/15 text-green-600`
    case 'cancelled':
      return `${base} bg-red-400/15 text-red-400`
    default:
      return base
  }
}

function statusLabel(dbStatus) {
  switch (dbStatus) {
    case 'pending':
      return 'Order Placed'
    case 'processing':
      return 'Processing'
    case 'shipped':
      return 'In Transit'
    case 'delivered':
      return 'Delivered'
    case 'cancelled':
      return 'Cancelled'
    default:
      return dbStatus
  }
}

/* ── Refund status badge ─────────────────────────────────── */

function RefundBadge({ status, refundAmount }) {
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

function RefundActionButton({ item, orderCreatedAt, orderStatus, token, onRefundChange }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
      <button
        type="button"
        disabled={loading}
        onClick={isPending ? handleCancel : handleRequest}
        className={`cursor-pointer rounded-[7px] border px-3 py-1.5 text-xs leading-none font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isPending
            ? 'border-red-400/40 bg-transparent text-red-400 hover:border-red-400 hover:bg-red-400/10'
            : 'border-[var(--border)] bg-transparent text-[var(--text)] hover:border-purple-400 hover:text-purple-400'
        }`}
      >
        {loading ? 'Loading…' : isPending ? 'Cancel Refund Request' : 'Request Refund'}
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  )
}

/* ── Review components ───────────────────────────────────── */

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

function ReviewModal({ item, token, onClose }) {
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit review')
      setSuccess(true)
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
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-[18px] font-bold text-[var(--text-h)]">Review Product</h2>
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
                Comment <span className="font-normal opacity-50">(optional)</span>
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share what you liked, how it fits, or anything helpful for others…"
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[14px] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus:border-purple-400/50 focus:outline-none"
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

function WriteReviewButton({ item, orderStatus, token }) {
  const [open, setOpen] = useState(false)

  if (orderStatus !== 'delivered') return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-[7px] border border-purple-400/40 bg-purple-400/10 px-3 py-1.5 text-xs leading-none font-semibold text-purple-400 transition-colors hover:border-purple-400/70 hover:bg-purple-400/20"
      >
        Write a Review
      </button>
      {open && <ReviewModal item={item} token={token} onClose={() => setOpen(false)} />}
    </>
  )
}

/* ── Sub-components ──────────────────────────────────────── */

function DeliveryTimeline({ dbStatus }) {
  const uiStatus = mapStatus(dbStatus)
  const activeIdx = STATUS_INDEX[uiStatus] ?? 0
  return (
    <div className="mb-6 flex items-start overflow-x-auto pb-1">
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

function OrderItems({ items, orderCreatedAt, orderStatus, token, onRefundChange }) {
  return (
    <ul className="m-0 mb-4 flex list-none flex-col gap-3 p-0">
      {items.map((item) => {
        const hue = nameHue(item.product_name)
        const lineTotal = parseFloat(item.price) * item.quantity
        return (
          <li key={item.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-3.5">
              <div
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg border border-[var(--border)]"
                style={{
                  background: `linear-gradient(160deg, hsl(${hue},35%,var(--cat-bg-l,12%)) 0%, hsl(${hue},45%,var(--cat-bg-l2,20%)) 100%)`,
                }}
              >
                <span
                  style={{
                    color: `hsl(${hue},70%,var(--cat-text-l,70%))`,
                    fontSize: 18,
                    fontWeight: 700,
                    opacity: 0.5,
                  }}
                >
                  {item.product_name[0]}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
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
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="shrink-0 text-sm font-bold text-[var(--text-h)]">
                  ${lineTotal.toFixed(2)}
                </span>
                {token && (
                  <div className="flex items-center gap-1.5">
                    <WriteReviewButton item={item} orderStatus={orderStatus} token={token} />
                    <RefundActionButton
                      item={item}
                      orderCreatedAt={orderCreatedAt}
                      orderStatus={orderStatus}
                      token={token}
                      onRefundChange={onRefundChange}
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

/* ── Page ────────────────────────────────────────────────── */

export default function OrdersPage({ onBack, token }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedPast, setExpandedPast] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [cancelError, setCancelError] = useState(null)

  async function fetchOrders() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_BASE}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json().catch(() => null)
      if (!r.ok) {
        setError(data?.error || 'Failed to load orders.')
        return
      }
      if (data?.orders) setOrders(data.orders)
      else setError('Failed to load orders.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentOrders = orders.filter(isActive)
  const pastOrders = orders.filter((o) => !isActive(o))

  function togglePast(id) {
    setExpandedPast((prev) => (prev === id ? null : id))
  }

  async function handleCancel(orderId) {
    setCancellingId(orderId)
    setCancelError(null)
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setCancelError(data.error || 'Failed to cancel order.')
        return
      }
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o)))
      setConfirmId(null)
    } catch {
      setCancelError('Network error. Please try again.')
    } finally {
      setCancellingId(null)
    }
  }

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
          <Link
            to="/"
            className="ml-auto cursor-pointer text-[22px] font-bold tracking-[4px] text-[var(--text-h)] no-underline"
          >
            FIER
          </Link>
        </div>
      </header>

      <main className="mx-auto box-border w-full max-w-[860px] px-6 pt-12 pb-20">
        <h1 className="mb-10 text-[32px] font-extrabold tracking-[-0.5px] text-[var(--text-h)]">
          My Orders
        </h1>

        {loading && <p className="text-sm text-[var(--text)]">Loading your orders…</p>}

        {error && <p className="rounded-xl bg-red-400/8 px-4 py-3 text-sm text-red-400">{error}</p>}

        {!loading && !error && (
          <>
            {/* ── Current Orders ── */}
            <section className="mb-14">
              <h2 className="mb-5 text-[20px] font-bold text-[var(--text-h)]">Current Orders</h2>

              {currentOrders.length === 0 ? (
                <p className="text-sm text-[var(--text)]">No active orders.</p>
              ) : (
                currentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="mb-5 rounded-2xl border border-purple-400 bg-[var(--card-bg)] p-6 shadow-[0_0_0_1px_rgba(192,132,252,0.2),var(--shadow)] backdrop-blur-xl"
                  >
                    <div className="mb-7 flex flex-wrap items-start justify-between gap-3 max-[600px]:flex-col">
                      <div className="flex flex-col gap-1">
                        <span className="text-[15px] font-bold text-[var(--text-h)]">
                          Order #{order.id}
                        </span>
                        <span className="text-xs text-[var(--text)]">
                          Placed {formatDate(order.created_at)}
                        </span>
                      </div>
                      <span className={statusPillClass(order.status)}>
                        {statusLabel(order.status)}
                      </span>
                    </div>

                    <DeliveryTimeline dbStatus={order.status} />

                    <OrderItems
                      items={order.items}
                      orderCreatedAt={order.created_at}
                      orderStatus={order.status}
                      token={token}
                      onRefundChange={fetchOrders}
                    />

                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-3.5 text-sm text-[var(--text)]">
                      <span>Order Total</span>
                      <span className="text-[16px] font-bold text-[var(--text-h)]">
                        ${parseFloat(order.total).toFixed(2)}
                      </span>
                    </div>

                    {isCancellable(order) && (
                      <div className="mt-4">
                        {cancelError && cancellingId === null && confirmId === order.id && (
                          <p className="mb-2 rounded-lg bg-red-400/8 px-3 py-2 text-center text-xs text-red-400">
                            {cancelError}
                          </p>
                        )}
                        {confirmId === order.id ? (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-xs text-[var(--text)]">
                              Are you sure you want to cancel this order?
                            </span>
                            <button
                              type="button"
                              className="cursor-pointer rounded-lg border border-red-400/40 bg-transparent px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => handleCancel(order.id)}
                              disabled={cancellingId === order.id}
                            >
                              {cancellingId === order.id ? 'Cancelling…' : 'Yes, cancel'}
                            </button>
                            <button
                              type="button"
                              className="cursor-pointer rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:border-purple-400/40 hover:text-purple-400"
                              onClick={() => {
                                setConfirmId(null)
                                setCancelError(null)
                              }}
                              disabled={cancellingId === order.id}
                            >
                              Keep order
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="cursor-pointer rounded-lg border border-red-400/30 bg-transparent px-4 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-400/10"
                            onClick={() => {
                              setConfirmId(order.id)
                              setCancelError(null)
                            }}
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </section>

            {/* ── Past Orders ── */}
            <section className="mb-14">
              <h2 className="m-0 mb-5 text-[20px] font-bold text-[var(--text-h)]">Past Orders</h2>

              {pastOrders.length === 0 ? (
                <p className="text-sm text-[var(--text)]">No past orders.</p>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl">
                  {pastOrders.map((order) => (
                    <div key={order.id} className="border-b border-[var(--border)] last:border-b-0">
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-between gap-3 border-none bg-transparent px-5 py-4 text-left transition-colors hover:bg-[var(--border)]"
                        onClick={() => togglePast(order.id)}
                        aria-expanded={expandedPast === order.id}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[15px] font-bold text-[var(--text-h)]">
                            Order #{order.id}
                          </span>
                          <span className="text-xs text-[var(--text)]">
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 max-[600px]:gap-2">
                          <span className="text-[13px] text-[var(--text)] max-[600px]:hidden">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                            &nbsp;·&nbsp;${parseFloat(order.total).toFixed(2)}
                          </span>
                          <span className={statusPillClass(order.status)}>
                            {statusLabel(order.status)}
                          </span>
                          <span
                            className={`flex items-center text-[var(--text)] transition-transform duration-200 ${expandedPast === order.id ? 'rotate-180' : ''}`}
                          >
                            <ChevronDownIcon />
                          </span>
                        </div>
                      </button>

                      {expandedPast === order.id && (
                        <div className="animate-[expand-in_0.15s_ease] border-t border-[var(--border)] bg-[var(--bg)] px-5 pb-4">
                          <div className="pt-4">
                            <OrderItems
                              items={order.items}
                              orderCreatedAt={order.created_at}
                              orderStatus={order.status}
                              token={token}
                              onRefundChange={fetchOrders}
                            />
                          </div>
                          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3.5 text-sm text-[var(--text)]">
                            <span>Order Total</span>
                            <span className="text-[16px] font-bold text-[var(--text-h)]">
                              ${parseFloat(order.total).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
