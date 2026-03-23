import { useState } from 'react'
import './HomePage.css'

const CATEGORIES = [
  { id: 1, title: "Women's Clothing", subtitle: 'New arrivals every week' },
  { id: 2, title: "Men's Clothing", subtitle: 'Timeless essentials' },
  { id: 3, title: 'Outerwear', subtitle: 'Coats, jackets & more' },
  { id: 4, title: 'Footwear', subtitle: 'Step into style' },
  { id: 5, title: 'Accessories', subtitle: 'Finish the look' },
  { id: 6, title: 'Activewear', subtitle: 'Move in comfort' },
  { id: 7, title: 'Formal', subtitle: 'Dress to impress' },
  { id: 8, title: 'Kids & Baby', subtitle: 'Adorable styles for little ones' },
]

function CartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function WishlistIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export default function HomePage({ onNavigate, onLogout }) {
  const [cartCount] = useState(0)
  const [wishlistCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="home">
      {/* Navbar */}
      <header className="navbar">
        <div className="navbar-inner">
          <div className="brand">MODÉ</div>

          <div className="search-bar">
            <span className="search-icon"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Search for clothes, brands…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <nav className="nav-actions">
            <button className="icon-btn" aria-label="Wishlist" onClick={() => onNavigate('wishlist')}>
              <WishlistIcon />
              {wishlistCount > 0 && <span className="badge">{wishlistCount}</span>}
            </button>
            <button className="icon-btn" aria-label="Shopping cart" onClick={() => onNavigate('cart')}>
              <CartIcon />
              {cartCount > 0 && <span className="badge">{cartCount}</span>}
            </button>
            <button className="logout-btn" onClick={onLogout}>Sign out</button>
          </nav>
        </div>
      </header>

      {/* Hero banner */}
      <section className="hero-banner">
        {/* Decorative background elements */}
        <div className="hero-decor" aria-hidden="true">
          <div className="decor-circle decor-circle-1" />
          <div className="decor-circle decor-circle-2" />
          <div className="decor-circle decor-circle-3" />
          <div className="decor-lines" />
          <div className="decor-diamond decor-diamond-1" />
          <div className="decor-diamond decor-diamond-2" />
          <div className="decor-stripe decor-stripe-1" />
          <div className="decor-stripe decor-stripe-2" />
          <div className="decor-stripe decor-stripe-3" />
        </div>

        <div className="hero-text">
          <p className="hero-eyebrow">New Season</p>
          <h1>Discover Your Style</h1>
          <p className="hero-sub">Curated fashion for every occasion</p>
          <button className="cta-btn">Shop Now</button>
        </div>
      </section>

      {/* Category grid */}
      <main className="categories-section">
        <h2 className="section-title">Browse Categories</h2>
        <div className="category-grid">
          {CATEGORIES.map(cat => (
            <button key={cat.id} className="category-card" onClick={() => onNavigate('category', cat)}>
              {/* Image placeholder — will be replaced with branded model photography */}
              <div className="card-image-placeholder">
                <span className="placeholder-label">{cat.title[0]}</span>
              </div>
              <div className="card-info">
                <span className="card-title">{cat.title}</span>
                <span className="card-subtitle">{cat.subtitle}</span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
