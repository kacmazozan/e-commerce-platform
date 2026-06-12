import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API_BASE from '../../api'
import { isActive, isCancellable, formatDate, statusPillClass, statusLabel } from './orderHelpers'
import { ChevronDownIcon, DeliveryTimeline, OrderItems } from './orderComponents'

/* ── Page ────────────────────────────────────────────────── */

export default function OrdersPage({ token }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedPast, setExpandedPast] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [cancelError, setCancelError] = useState(null)
  const [reviewedIds, setReviewedIds] = useState(new Set())

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
    if (!token) return
    fetchOrders()
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
  }, [token])

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
                      <div className="flex items-center gap-3">
                        <span className={statusPillClass(order.status)}>
                          {statusLabel(order.status)}
                        </span>
                        <Link
                          to={`/orders/${order.id}`}
                          className="cursor-pointer rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:border-purple-400 hover:text-purple-400"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>

                    <DeliveryTimeline dbStatus={order.status} />

                    <OrderItems
                      items={order.items}
                      orderCreatedAt={order.created_at}
                      orderStatus={order.status}
                      token={token}
                      onRefundChange={fetchOrders}
                      reviewedIds={reviewedIds}
                      onReviewed={(pid) => setReviewedIds((prev) => new Set([...prev, pid]))}
                      onNavigateReviews={() => navigate('/my-reviews')}
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
                              reviewedIds={reviewedIds}
                              onReviewed={(pid) =>
                                setReviewedIds((prev) => new Set([...prev, pid]))
                              }
                              onNavigateReviews={() => navigate('/my-reviews')}
                            />
                          </div>
                          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3.5 text-sm text-[var(--text)]">
                            <span>Order Total</span>
                            <span className="text-[16px] font-bold text-[var(--text-h)]">
                              ${parseFloat(order.total).toFixed(2)}
                            </span>
                          </div>
                          <div className="pt-3 text-right">
                            <Link
                              to={`/orders/${order.id}`}
                              className="cursor-pointer rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:border-purple-400 hover:text-purple-400"
                            >
                              View Details
                            </Link>
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
