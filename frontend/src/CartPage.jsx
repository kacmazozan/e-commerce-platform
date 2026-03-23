import './CartPage.css'

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

export default function CartPage({ onBack }) {
  return (
    <div className="cart-page">
      <header className="cart-header">
        <div className="cart-header-inner">
          <button className="back-btn" onClick={onBack}>
            <BackIcon /> Back
          </button>
          <span className="brand">MODÉ</span>
        </div>
      </header>

      <main className="cart-main">
        <h1 className="cart-title">Shopping Cart</h1>

        <div className="cart-empty">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          <p className="empty-title">Your cart is empty</p>
          <p className="empty-sub">Browse our categories and add items you love.</p>
          <button className="cta-btn" onClick={onBack}>Start Shopping</button>
        </div>
      </main>
    </div>
  )
}
