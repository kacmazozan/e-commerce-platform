import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import API_BASE from '../../api'
import { isCancellable, formatDate, statusPillClass, statusLabel } from './orderHelpers'
import { DeliveryTimeline, OrderItems } from './orderComponents'

export default function OrderDetailPage({ token }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reviewedIds, setReviewedIds] = useState(new Set())
  const [cancelling, setCancelling] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  async function fetchOrder() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_BASE}/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json().catch(() => null)
      if (!r.ok) {
        setError(data?.error || 'Failed to load order.')
        return
      }
      if (data?.order) setOrder(data.order)
      else setError('Failed to load order.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    fetchOrder()
    fetch(`${API_BASE}/api/products/reviews/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.reviews) {
          setReviewedIds(new Set(data.reviews.map((r) => r.product_id)))
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id])

  async function handleCancel() {
    setCancelling(true)
    setCancelError(null)
    try {
      const res = await fetch(`${API_BASE}/api/orders/${id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setCancelError(data.error || 'Failed to cancel order.')
        return
      }
      setOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : prev))
      setConfirming(false)
    } catch {
      setCancelError('Network error. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const shippingCost = order ? parseFloat(order.shipping_cost ?? 0) : 0
  const subtotal = order ? parseFloat(order.total) : 0
  const grandTotal = subtotal + shippingCost
  const addressLines = order?.address ? order.address.split('\n').filter(Boolean) : []

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
      <main className="mx-auto box-border w-full max-w-[860px] px-6 pt-12 pb-20">
        <Link
          to="/orders"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text)] transition-colors hover:text-purple-400"
        >
          ← Back to Orders
        </Link>

        {loading && <p className="text-sm text-[var(--text)]">Loading order…</p>}

        {error && <p className="rounded-xl bg-red-400/8 px-4 py-3 text-sm text-red-400">{error}</p>}

        {!loading && !error && order && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)] backdrop-blur-xl">
            <div className="mb-7 flex flex-wrap items-start justify-between gap-3 max-[600px]:flex-col">
              <div className="flex flex-col gap-1">
                <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.5px] text-[var(--text-h)]">
                  Order #{order.id}
                </h1>
                <span className="text-xs text-[var(--text)]">
                  Placed {formatDate(order.created_at)}
                </span>
              </div>
              <span className={statusPillClass(order.status)}>{statusLabel(order.status)}</span>
            </div>

            <DeliveryTimeline dbStatus={order.status} />

            <h2 className="mb-3 text-[15px] font-bold text-[var(--text-h)]">Items</h2>
            <OrderItems
              items={order.items}
              orderCreatedAt={order.created_at}
              orderStatus={order.status}
              token={token}
              onRefundChange={fetchOrder}
              reviewedIds={reviewedIds}
              onReviewed={(pid) => setReviewedIds((prev) => new Set([...prev, pid]))}
              onNavigateReviews={() => navigate('/my-reviews')}
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <h3 className="mb-2 text-[13px] font-bold tracking-[0.5px] text-[var(--text-h)] uppercase">
                  Delivery Address
                </h3>
                {addressLines.length === 0 ? (
                  <p className="text-sm text-[var(--text)]">No address on file.</p>
                ) : (
                  <address className="text-sm leading-[1.6] text-[var(--text)] not-italic">
                    {addressLines.map((line, i) => (
                      <span key={i} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                )}
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <h3 className="mb-2 text-[13px] font-bold tracking-[0.5px] text-[var(--text-h)] uppercase">
                  Order Summary
                </h3>
                <div className="flex flex-col gap-1.5 text-sm text-[var(--text)]">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping</span>
                    <span>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between border-t border-[var(--border)] pt-1.5 text-[15px] font-bold text-[var(--text-h)]">
                    <span>Total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {isCancellable(order) && (
              <div className="mt-6">
                {cancelError && (
                  <p className="mb-2 rounded-lg bg-red-400/8 px-3 py-2 text-center text-xs text-red-400">
                    {cancelError}
                  </p>
                )}
                {confirming ? (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-xs text-[var(--text)]">
                      Are you sure you want to cancel this order?
                    </span>
                    <button
                      type="button"
                      className="cursor-pointer rounded-lg border border-red-400/40 bg-transparent px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={handleCancel}
                      disabled={cancelling}
                    >
                      {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:border-purple-400/40 hover:text-purple-400"
                      onClick={() => {
                        setConfirming(false)
                        setCancelError(null)
                      }}
                      disabled={cancelling}
                    >
                      Keep order
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="cursor-pointer rounded-lg border border-red-400/30 bg-transparent px-4 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-400/10"
                    onClick={() => {
                      setConfirming(true)
                      setCancelError(null)
                    }}
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
