import { useState, useEffect } from 'react'
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

function OrderItems({ items }) {
  return (
    <ul className="m-0 mb-4 flex list-none flex-col gap-3 p-0">
      {items.map((item) => {
        const hue = nameHue(item.product_name)
        const lineTotal = parseFloat(item.price) * item.quantity
        return (
          <li
            key={`${item.order_id}-${item.product_id}-${item.size ?? ''}`}
            className="flex items-center gap-3.5"
          >
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
              <span className="text-sm font-semibold text-[var(--text-h)]">
                {item.product_name}
              </span>
              <span className="text-xs text-[var(--text)]">
                {item.size ? `Size ${item.size} · ` : ''}Qty {item.quantity}
              </span>
            </div>
            <span className="shrink-0 text-sm font-bold text-[var(--text-h)]">
              ${lineTotal.toFixed(2)}
            </span>
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

  useEffect(() => {
    fetch(`${API_BASE}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        let data = null
        try {
          data = await r.json()
        } catch {
          data = null
        }
        if (!r.ok) {
          setError(data?.error || 'Failed to load orders.')
          return
        }
        if (Array.isArray(data?.orders)) setOrders(data.orders)
      })
      .catch(() => setError('Network error. Please try again.'))
      .finally(() => setLoading(false))
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

                    <OrderItems items={order.items} />

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
                            <OrderItems items={order.items} />
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
