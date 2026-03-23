import { useState } from 'react'
import './OrdersPage.css'

/* ── Mock data ───────────────────────────────────────────── */

const TIMELINE_STEPS = [
  { key: 'placed',            label: 'Order Placed' },
  { key: 'processing',        label: 'Processing' },
  { key: 'shipped',           label: 'Shipped' },
  { key: 'out_for_delivery',  label: 'Out for Delivery' },
  { key: 'delivered',         label: 'Delivered' },
]

const STATUS_INDEX = {
  placed: 0, processing: 1, shipped: 2, out_for_delivery: 3, delivered: 4,
}

const CURRENT_ORDERS = [
  {
    id: 'ORD-2851',
    trackingCode: 'GB748291051AB',
    carrier: 'DPD',
    status: 'out_for_delivery',
    placedDate: '21 Mar 2026',
    estimatedDelivery: '23 Mar 2026',
    items: [
      { name: 'Leather Chelsea Boots', variant: 'EU 42', qty: 1, price: 149.99, hue: 160 },
    ],
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
      { name: 'Oversized Linen Shirt', variant: 'Size M',     qty: 1, price: 79.99,  hue: 280 },
      { name: 'Slim Fit Chinos',       variant: '32W 32L',    qty: 1, price: 69.99,  hue: 210 },
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
      { name: 'Ribbed Midi Dress',   variant: 'Size S', qty: 1, price: 94.99, hue: 340 },
      { name: 'Structured Tote',     variant: 'Black',  qty: 1, price: 139.99, hue: 40 },
    ],
    total: 234.98,
  },
  {
    id: 'ORD-2756',
    date: '10 Mar 2026',
    status: 'delivered',
    items: [
      { name: 'Merino Polo',         variant: 'Size L / Navy',   qty: 2, price: 89.99, hue: 190 },
    ],
    total: 179.98,
  },
  {
    id: 'ORD-2712',
    date: '2 Mar 2026',
    status: 'delivered',
    items: [
      { name: 'Cropped Blazer',      variant: 'Size 10 / Camel', qty: 1, price: 179.99, hue: 260 },
      { name: 'Leather Belt',        variant: 'S/M',             qty: 1, price: 44.99,  hue: 40  },
    ],
    total: 224.98,
  },
  {
    id: 'ORD-2680',
    date: '25 Feb 2026',
    status: 'delivered',
    items: [
      { name: 'Trench Coat',         variant: 'Size 12 / Beige', qty: 1, price: 189.99, hue: 200 },
    ],
    total: 189.99,
  },
]

/* ── Icons ───────────────────────────────────────────────── */

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

/* ── Sub-components ──────────────────────────────────────── */

function DeliveryTimeline({ status }) {
  const activeIdx = STATUS_INDEX[status] ?? 0
  return (
    <div className="timeline">
      {TIMELINE_STEPS.map((step, i) => {
        const done    = i < activeIdx
        const current = i === activeIdx
        return (
          <div key={step.key} className={`timeline-step${done ? ' done' : ''}${current ? ' current' : ''}`}>
            {i > 0 && <div className={`timeline-connector${i <= activeIdx ? ' filled' : ''}`} />}
            <div className="timeline-dot">
              {done ? <CheckIcon /> : null}
            </div>
            <span className="timeline-label">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function TrackingRow({ code, carrier }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="tracking-row">
      <div className="tracking-info">
        <span className="tracking-carrier">{carrier}</span>
        <span className="tracking-code">{code}</span>
      </div>
      <button className="copy-btn" onClick={copy} aria-label="Copy tracking code">
        {copied ? 'Copied!' : <><CopyIcon /> Copy</>}
      </button>
    </div>
  )
}

function OrderItems({ items }) {
  return (
    <ul className="order-items">
      {items.map((item, i) => (
        <li key={i} className="order-item">
          <div className="order-item-thumb" style={{ background: `linear-gradient(160deg, hsl(${item.hue},35%,12%) 0%, hsl(${item.hue},45%,20%) 100%)` }}>
            <span style={{ color: `hsl(${item.hue},70%,70%)`, fontSize: 18, fontWeight: 700, opacity: 0.5 }}>{item.name[0]}</span>
          </div>
          <div className="order-item-info">
            <span className="order-item-name">{item.name}</span>
            <span className="order-item-variant">{item.variant} · Qty {item.qty}</span>
          </div>
          <span className="order-item-price">${(item.price * item.qty).toFixed(2)}</span>
        </li>
      ))}
    </ul>
  )
}

/* ── Page ────────────────────────────────────────────────── */

export default function OrdersPage({ onBack }) {
  const [expandedPast, setExpandedPast] = useState(null)

  function togglePast(id) {
    setExpandedPast(prev => (prev === id ? null : id))
  }

  return (
    <div className="orders-page">
      <header className="orders-header">
        <div className="orders-header-inner">
          <button className="back-btn" onClick={onBack}><BackIcon /> Back</button>
          <span className="brand">MODÉ</span>
        </div>
      </header>

      <main className="orders-main">
        <h1 className="orders-title">My Orders</h1>

        {/* ── Current Orders ── */}
        <section className="orders-section">
          <h2 className="orders-section-title">Current Orders</h2>

          {CURRENT_ORDERS.length === 0 ? (
            <p className="orders-empty">No active orders.</p>
          ) : (
            CURRENT_ORDERS.map(order => (
              <div key={order.id} className="order-card order-card--active">
                {/* Card header */}
                <div className="order-card-header">
                  <div className="order-meta">
                    <span className="order-id">{order.id}</span>
                    <span className="order-date">Placed {order.placedDate}</span>
                  </div>
                  <div className="order-card-header-right">
                    <span className="order-est">Est. delivery <strong>{order.estimatedDelivery}</strong></span>
                    <span className={`order-status-pill status-${order.status}`}>
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
                <div className="order-total-row">
                  <span>Order Total</span>
                  <span className="order-total-amount">${order.total.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </section>

        {/* ── Past Orders ── */}
        <section className="orders-section">
          <div className="orders-section-header">
            <h2 className="orders-section-title">Past Orders</h2>
            <span className="orders-section-sub">Last 30 days</span>
          </div>

          {PAST_ORDERS.length === 0 ? (
            <p className="orders-empty">No orders in the last 30 days.</p>
          ) : (
            <div className="past-orders-list">
              {PAST_ORDERS.map(order => (
                <div key={order.id} className="past-order">
                  <button
                    className="past-order-row"
                    onClick={() => togglePast(order.id)}
                    aria-expanded={expandedPast === order.id}
                  >
                    <div className="past-order-left">
                      <span className="order-id">{order.id}</span>
                      <span className="order-date">{order.date}</span>
                    </div>
                    <div className="past-order-right">
                      <span className="past-order-summary">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        &nbsp;·&nbsp;${order.total.toFixed(2)}
                      </span>
                      <span className="order-status-pill status-delivered">Delivered</span>
                      <span className={`chevron${expandedPast === order.id ? ' chevron--open' : ''}`}>
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </button>

                  {expandedPast === order.id && (
                    <div className="past-order-detail">
                      <OrderItems items={order.items} />
                      <div className="order-total-row">
                        <span>Order Total</span>
                        <span className="order-total-amount">${order.total.toFixed(2)}</span>
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
