import { useState, useEffect, useRef } from 'react'
import './HomePage.css'

const HERO_THEMES = [
  'linear-gradient(135deg, #0d0d1a 0%, #1a1030 40%, #2a1040 70%, #0d1a2e 100%)', // purple
  'linear-gradient(135deg, #071a0f 0%, #0d2818 40%, #0f3520 70%, #061510 100%)', // forest
  'linear-gradient(135deg, #1a060d 0%, #2a0f18 40%, #350f22 70%, #160810 100%)', // rose
  'linear-gradient(135deg, #06101a 0%, #0d1828 40%, #0f2040 70%, #06101e 100%)', // navy
  'linear-gradient(135deg, #1a1006 0%, #2a1e08 40%, #34260a 70%, #1a1506 100%)', // amber
]

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

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function OrdersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export default function HomePage({ onNavigate, onLogout }) {
  const [cartCount] = useState(0)
  const [wishlistCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [heroIndex, setHeroIndex] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const avatarRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function goTo(idx) {
    if (transitioning) return
    setTransitioning(true)
    setTimeout(() => {
      setHeroIndex(idx)
      setTransitioning(false)
    }, 350)
  }

  useEffect(() => {
    if (transitioning) return
    const id = setTimeout(() => {
      setTransitioning(true)
      setTimeout(() => {
        setHeroIndex(i => (i + 1) % HERO_THEMES.length)
        setTransitioning(false)
      }, 350)
    }, 5000)
    return () => clearTimeout(id)
  }, [heroIndex, transitioning])

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
            <div className="avatar-menu" ref={avatarRef}>
              <button
                className="avatar-btn"
                onClick={() => setAvatarOpen(o => !o)}
                aria-label="Account menu"
                aria-expanded={avatarOpen}
              >
                <UserIcon />
              </button>

              {avatarOpen && (
                <div className="avatar-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar-circle"><UserIcon /></div>
                    <div>
                      <p className="dropdown-name">My Account</p>
                      <p className="dropdown-email">user@example.com</p>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  <button className="dropdown-item">
                    <OrdersIcon /> My Orders
                  </button>
                  <button className="dropdown-item" onClick={() => { setAvatarOpen(false); onNavigate('wishlist') }}>
                    <WishlistIcon /> Wishlist
                  </button>

                  <div className="dropdown-divider" />

                  <button className="dropdown-item">
                    <SettingsIcon /> Account Settings
                  </button>
                  <button className="dropdown-item">
                    <HelpIcon /> Help & Support
                  </button>

                  <div className="dropdown-divider" />

                  <button className="dropdown-item dropdown-item--danger" onClick={onLogout}>
                    <LogoutIcon /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero banner */}
      <section className="hero-banner">
        {/* Animated background */}
        <div
          className={`hero-bg${transitioning ? ' hero-bg--fading' : ''}`}
          style={{ background: HERO_THEMES[heroIndex] }}
          aria-hidden="true"
        />

        {/* Arrow controls */}
        <div className="hero-arrows" aria-hidden="true">
          <button
            className="hero-arrow"
            onClick={() => goTo((heroIndex - 1 + HERO_THEMES.length) % HERO_THEMES.length)}
            aria-label="Previous theme"
          >
            <ChevronLeftIcon />
          </button>
          <button
            className="hero-arrow"
            onClick={() => goTo((heroIndex + 1) % HERO_THEMES.length)}
            aria-label="Next theme"
          >
            <ChevronRightIcon />
          </button>
        </div>

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
      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">

          {/* Brand + newsletter */}
          <div className="footer-brand-col">
            <span className="footer-brand">MODÉ</span>
            <p className="footer-tagline">Curated fashion for every occasion.</p>
            <form className="footer-newsletter" onSubmit={e => e.preventDefault()}>
              <input type="email" placeholder="Your email address" aria-label="Email for newsletter" />
              <button type="submit">Subscribe</button>
            </form>
          </div>

          {/* Links */}
          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>Shop</h4>
              <ul>
                <li>Women's Clothing</li>
                <li>Men's Clothing</li>
                <li>Outerwear</li>
                <li>Footwear</li>
                <li>Accessories</li>
                <li>Sale</li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Customer Service</h4>
              <ul>
                <li>Contact Us</li>
                <li>Track My Order</li>
                <li>Returns & Exchanges</li>
                <li>Shipping Info</li>
                <li>Size Guide</li>
                <li>FAQ</li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li>About Us</li>
                <li>Careers</li>
                <li>Press</li>
                <li>Sustainability</li>
                <li>Affiliate Program</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-inner">
            <p className="footer-legal">
              © {new Date().getFullYear()} MODÉ. All rights reserved.
              &nbsp;·&nbsp;
              <span>Privacy Policy</span>
              &nbsp;·&nbsp;
              <span>Terms of Service</span>
              &nbsp;·&nbsp;
              <span>Cookie Settings</span>
            </p>
            <div className="footer-social">
              {/* Instagram */}
              <a href="#" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                </svg>
              </a>
              {/* TikTok */}
              <a href="#" aria-label="TikTok">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
              </a>
              {/* Pinterest */}
              <a href="#" aria-label="Pinterest">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.65 7.86 6.39 9.29-.09-.78-.17-1.98.03-2.83.19-.77 1.27-5.38 1.27-5.38s-.32-.65-.32-1.61c0-1.51.88-2.64 1.97-2.64.93 0 1.38.7 1.38 1.54 0 .94-.6 2.34-.91 3.64-.26 1.09.54 1.97 1.6 1.97 1.92 0 3.21-2.47 3.21-5.39 0-2.23-1.51-3.79-3.67-3.79-2.5 0-3.97 1.88-3.97 3.82 0 .76.29 1.57.66 2.01.07.09.08.17.06.26l-.25 1c-.04.16-.13.19-.3.12-1.11-.52-1.81-2.14-1.81-3.44 0-2.8 2.03-5.37 5.86-5.37 3.08 0 5.47 2.19 5.47 5.12 0 3.05-1.92 5.51-4.59 5.51-.9 0-1.74-.47-2.03-1.02l-.55 2.07c-.2.77-.74 1.73-1.1 2.32.83.26 1.7.4 2.61.4 5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                </svg>
              </a>
              {/* Facebook */}
              <a href="#" aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
