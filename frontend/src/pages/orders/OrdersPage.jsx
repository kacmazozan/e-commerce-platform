import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

/* ── Mock data ───────────────────────────────────────────── */

const TIMELINE_STEPS = [
  { key: 'placed', label: 'Order Placed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
]

const STATUS_INDEX = {
  placed: 0,
  processing: 1,
  shipped: 2,
  out_for_delivery: 3,
  delivered: 4,
}

const CURRENT_ORDERS = [
  {
    id: 'ORD-2851',
    trackingCode: 'GB748291051AB',
    carrier: 'DPD',
    status: 'out_for_delivery',
    placedDate: '21 Mar 2026',
    estimatedDelivery: '23 Mar 2026',
    items: [{ name: 'Leather Chelsea Boots', variant: 'EU 42', qty: 1, price: 149.99, hue: 160 }],
    total: 149.99,
  },
  {
    id: 'ORD-2847',
    trackingCode: 'GB748291047XY',
    carrier: 'Royal Mail',
    status: 'shipped',
    placedDate: '20 Mar 2026',
    estimatedDelivery: '25 Mar 2026',
    items: [
      { name: 'Oversized Linen Shirt', variant: 'Size M', qty: 1, price: 79.99, hue: 280 },
      { name: 'Slim Fit Chinos', variant: '32W 32L', qty: 1, price: 69.99, hue: 210 },
    ],
    total: 149.98,
  },
]

const PAST_ORDERS = [
  {
    id: 'ORD-2799',
    date: '18 Mar 2026',
    status: 'delivered',
    items: [
      { name: 'Ribbed Midi Dress', variant: 'Size S', qty: 1, price: 94.99, hue: 340 },
      { name: 'Structured Tote', variant: 'Black', qty: 1, price: 139.99, hue: 40 },
    ],
    total: 234.98,
  },
  {
    id: 'ORD-2756',
    date: '10 Mar 2026',
    status: 'delivered',
    items: [{ name: 'Merino Polo', variant: 'Size L / Navy', qty: 2, price: 89.99, hue: 190 }],
    total: 179.98,
  },
  {
    id: 'ORD-2712',
    date: '2 Mar 2026',
    status: 'delivered',
    items: [
      { name: 'Cropped Blazer', variant: 'Size 10 / Camel', qty: 1, price: 179.99, hue: 260 },
      { name: 'Leather Belt', variant: 'S/M', qty: 1, price: 44.99, hue: 40 },
    ],
    total: 224.98,
  },
  {
    id: 'ORD-2680',
    date: '25 Feb 2026',
    status: 'delivered',
    items: [{ name: 'Trench Coat', variant: 'Size 12 / Beige', qty: 1, price: 189.99, hue: 200 }],
    total: 189.99,
  },
]

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

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

/* ── Status pill helper ──────────────────────────────────── */

function statusPillClass(status) {
  const base = 'inline-block text-[11px] font-bold tracking-[0.5px] px-2.5 py-1 rounded-full'
  switch (status) {
    case 'placed':
      return `${base} bg-slate-500/15 text-slate-500`
    case 'processing':
      return `${base} bg-amber-500/15 text-amber-600`
    case 'shipped':
      return `${base} bg-blue-500/15 text-blue-500`
    case 'out_for_delivery':
      return `${base} bg-purple-400/15 text-purple-400`
    case 'delivered':
      return `${base} bg-green-500/15 text-green-600`
    default:
      return base
  }
}

/* ── Sub-components ──────────────────────────────────────── */

function DeliveryTimeline({ status }) {
  const activeIdx = STATUS_INDEX[status] ?? 0
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

function TrackingRow({ code, carrier }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function copy() {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-bold tracking-[1.5px] text-[var(--text)] uppercase">
          {carrier}
        </span>
        <span className="font-mono text-[15px] font-bold tracking-[1px] text-[var(--text-h)]">
          {code}
        </span>
      </div>
      <button
        className="flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-[var(--text)] transition-colors hover:border-purple-400 hover:text-purple-400"
        onClick={copy}
        aria-label="Copy tracking code"
      >
        {copied ? (
          'Copied!'
        ) : (
          <>
            <CopyIcon /> Copy
          </>
        )}
      </button>
    </div>
  )
}

function OrderItems({ items }) {
  return (
    <ul className="m-0 mb-4 flex list-none flex-col gap-3 p-0">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-3.5">
          <div
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg border border-[var(--border)]"
            style={{
              background: `linear-gradient(160deg, hsl(${item.hue},35%,var(--cat-bg-l,12%)) 0%, hsl(${item.hue},45%,var(--cat-bg-l2,20%)) 100%)`,
            }}
          >
            <span
              style={{
                color: `hsl(${item.hue},70%,var(--cat-text-l,70%))`,
                fontSize: 18,
                fontWeight: 700,
                opacity: 0.5,
              }}
            >
              {item.name[0]}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold text-[var(--text-h)]">{item.name}</span>
            <span className="text-xs text-[var(--text)]">
              {item.variant} · Qty {item.qty}
            </span>
          </div>
          <span className="shrink-0 text-sm font-bold text-[var(--text-h)]">
            ${(item.price * item.qty).toFixed(2)}
          </span>
        </li>
      ))}
    </ul>
  )
}

/* ── Page ────────────────────────────────────────────────── */

export default function OrdersPage({ onBack }) {
  const [expandedPast, setExpandedPast] = useState(null)

  function togglePast(id) {
    setExpandedPast((prev) => (prev === id ? null : id))
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
      <header className="fixed top-0 right-0 left-0 z-[1000] border-b border-[var(--border)] bg-[rgba(var(--background-rgb),0.75)] px-6 backdrop-blur-[20px]">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4">
          <button
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

        {/* ── Current Orders ── */}
        <section className="mb-14">
          <h2 className="mb-5 text-[20px] font-bold text-[var(--text-h)]">Current Orders</h2>

          {CURRENT_ORDERS.length === 0 ? (
            <p className="text-sm text-[var(--text)]">No active orders.</p>
          ) : (
            CURRENT_ORDERS.map((order) => (
              <div
                key={order.id}
                className="mb-5 rounded-2xl border border-purple-400 bg-[var(--card-bg)] p-6 shadow-[0_0_0_1px_rgba(192,132,252,0.2),var(--shadow)] backdrop-blur-xl"
              >
                {/* Card header */}
                <div className="mb-7 flex flex-wrap items-start justify-between gap-3 max-[600px]:flex-col">
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-bold text-[var(--text-h)]">{order.id}</span>
                    <span className="text-xs text-[var(--text)]">Placed {order.placedDate}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 max-[600px]:items-start">
                    <span className="text-[13px] text-[var(--text)]">
                      Est. delivery{' '}
                      <strong className="text-[var(--text-h)]">{order.estimatedDelivery}</strong>
                    </span>
                    <span className={statusPillClass(order.status)}>
                      {TIMELINE_STEPS[STATUS_INDEX[order.status]]?.label}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <DeliveryTimeline status={order.status} />

                {/* Tracking */}
                <TrackingRow code={order.trackingCode} carrier={order.carrier} />

                {/* Items */}
                <OrderItems items={order.items} />

                {/* Total */}
                <div className="flex items-center justify-between border-t border-[var(--border)] pt-3.5 text-sm text-[var(--text)]">
                  <span>Order Total</span>
                  <span className="text-[16px] font-bold text-[var(--text-h)]">
                    ${order.total.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </section>

        {/* ── Past Orders ── */}
        <section className="mb-14">
          <div className="mb-5 flex items-baseline gap-2.5">
            <h2 className="m-0 text-[20px] font-bold text-[var(--text-h)]">Past Orders</h2>
            <span className="text-[13px] text-[var(--text)]">Last 30 days</span>
          </div>

          {PAST_ORDERS.length === 0 ? (
            <p className="text-sm text-[var(--text)]">No orders in the last 30 days.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl">
              {PAST_ORDERS.map((order) => (
                <div key={order.id} className="border-b border-[var(--border)] last:border-b-0">
                  <button
                    className="flex w-full cursor-pointer items-center justify-between gap-3 border-none bg-transparent px-5 py-4 text-left transition-colors hover:bg-[var(--border)]"
                    onClick={() => togglePast(order.id)}
                    aria-expanded={expandedPast === order.id}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-[var(--text-h)]">{order.id}</span>
                      <span className="text-xs text-[var(--text)]">{order.date}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 max-[600px]:gap-2">
                      <span className="text-[13px] text-[var(--text)] max-[600px]:hidden">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        &nbsp;·&nbsp;${order.total.toFixed(2)}
                      </span>
                      <span className={statusPillClass('delivered')}>Delivered</span>
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
                          ${order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
