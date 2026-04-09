import { useState, useEffect, useRef } from 'react'
import { MiniCartIcon, StarRating } from '../../components/icons'
import Navbar from './components/Navbar'
import HeroBanner from './components/HeroBanner'
import Footer from './components/Footer'
import API_BASE from '../../api'

const CATEGORIES = [
  { id: 1, title: "Women's Clothing", subtitle: 'New arrivals every week', hue: 280 },
  { id: 2, title: "Men's Clothing", subtitle: 'Timeless essentials', hue: 210 },
  { id: 3, title: 'Outerwear', subtitle: 'Coats, jackets & more', hue: 200 },
  { id: 4, title: 'Footwear', subtitle: 'Step into style', hue: 160 },
  { id: 5, title: 'Accessories', subtitle: 'Finish the look', hue: 40 },
  { id: 6, title: 'Activewear', subtitle: 'Move in comfort', hue: 340 },
  { id: 7, title: 'Formal', subtitle: 'Dress to impress', hue: 260 },
  { id: 8, title: 'Kids & Baby', subtitle: 'Adorable styles for little ones', hue: 20 },
]

const CATEGORY_HUE = {
  "Women's Clothing": 280,
  "Men's Clothing": 210,
  Outerwear: 200,
  Footwear: 160,
  Accessories: 40,
  Activewear: 340,
  Formal: 260,
  'Kids & Baby': 20,
}

const REVIEWS = [
  {
    id: 1,
    name: 'Sophie M.',
    rating: 5,
    text: 'Absolutely love the quality. The fabric is soft and the fit is perfect — I get compliments every time I wear it.',
  },
  {
    id: 2,
    name: 'James K.',
    rating: 5,
    text: 'Fast shipping and exactly as described. Already ordered two more colours.',
  },
  {
    id: 3,
    name: 'Priya R.',
    rating: 4,
    text: 'Great value for money. Sizing runs slightly large but the quality is excellent.',
  },
  {
    id: 4,
    name: 'Lucas B.',
    rating: 5,
    text: "The best online fashion store I've used. Returns were hassle-free too.",
  },
  {
    id: 5,
    name: 'Emma T.',
    rating: 5,
    text: 'Stunning piece — looks even better in person. Will definitely be shopping here again.',
  },
  {
    id: 6,
    name: 'Callum D.',
    rating: 4,
    text: 'Really happy with my purchase. Packaged beautifully and arrived ahead of schedule.',
  },
  {
    id: 7,
    name: 'Yuki N.',
    rating: 5,
    text: 'I was unsure about ordering online but the size guide was spot on. Perfect fit!',
  },
  {
    id: 8,
    name: 'Amara O.',
    rating: 5,
    text: 'Lovely materials and the colours are true to the photos. Highly recommend.',
  },
  {
    id: 9,
    name: 'Finn W.',
    rating: 4,
    text: 'Solid quality at a fair price. The stitching is neat and it washes really well.',
  },
  {
    id: 10,
    name: 'Isabella C.',
    rating: 5,
    text: 'Customer service was brilliant when I needed to exchange a size. So easy.',
  },
]

const sectionCls = 'relative z-[1] mx-auto w-full max-w-[1280px] px-6 py-16 pb-20 box-border'
const sectionDividerCls =
  "after:absolute after:bottom-0 after:-left-[100vw] after:-right-[100vw] after:h-px after:content-[''] after:[background:linear-gradient(to_right,transparent,rgba(140,100,200,0.15)_30%,rgba(160,120,220,0.2)_50%,rgba(140,100,200,0.15)_70%,transparent)]"

export default function HomePage({
  isLoggedIn,
  userEmail,
  onNavigate,
  onRequireAuth,
  onLogout,
  cartCount = 0,
  wishlistCount = 0,
  onAddToCart,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [newReleases, setNewReleases] = useState([])
  const releasesRef = useRef(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/products?limit=8`)
      .then((r) => r.json())
      .then((data) => setNewReleases(data.products ?? []))
      .catch(() => setNewReleases([]))
  }, [])

  function scrollReleases(dir) {
    const el = releasesRef.current
    if (el) el.scrollBy({ left: dir * 240, behavior: 'smooth' })
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] text-left">
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        style={{
          background:
            'linear-gradient(170deg, var(--bg) 0%, var(--bg-gradient-to) 25%, var(--accent-bg) 50%, var(--bg-gradient-to) 75%, var(--bg) 100%)',
        }}
        aria-hidden="true"
      />

      <Navbar
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        onNavigate={onNavigate}
        onRequireAuth={onRequireAuth}
        onLogout={onLogout}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <HeroBanner />

      {/* ── Category grid ── */}
      <main className={`${sectionCls} ${sectionDividerCls}`}>
        <div className="mb-8 flex items-end justify-between">
          <h2 className="m-0 text-[28px] font-bold tracking-[-0.5px] text-[var(--text-h)]">
            Browse Categories
          </h2>
          <button className="shrink-0 cursor-pointer border-none bg-transparent p-1 text-[13px] font-semibold tracking-[0.3px] text-purple-400 transition-opacity hover:opacity-75">
            View All
          </button>
        </div>

        <div className="grid grid-cols-4 gap-5 max-[720px]:grid-cols-2 max-[720px]:gap-3.5 max-[420px]:grid-cols-1 max-lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className="flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-0 text-left shadow-[var(--shadow)] backdrop-blur-xl transition-[box-shadow,transform,border-color] duration-[250ms] hover:-translate-y-1 hover:border-purple-400/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.15),0_0_0_1px_rgba(192,132,252,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]"
              onClick={() => onNavigate('category', cat)}
            >
              <div
                className="flex aspect-[3/4] w-full items-center justify-center border-b border-[var(--glass-border)]"
                style={{
                  background: `linear-gradient(160deg, hsl(${cat.hue},35%,var(--cat-bg-l,10%)) 0%, hsl(${cat.hue},45%,var(--cat-bg-l2,17%)) 100%)`,
                }}
              >
                <span
                  className="text-[64px] font-bold opacity-35 select-none"
                  style={{ color: `hsl(${cat.hue},70%,var(--cat-text-l,70%))` }}
                >
                  {cat.title[0]}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-4">
                <span className="text-[15px] font-semibold text-[var(--text-h)]">{cat.title}</span>
                <span className="text-[13px] text-[var(--text)]">{cat.subtitle}</span>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* ── New Releases ── */}
      <section className={`${sectionCls} ${sectionDividerCls}`}>
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="m-0 mb-1.5 text-[11px] font-bold tracking-[4px] text-purple-400 uppercase">
              Just Dropped
            </p>
            <h2 className="m-0 text-[28px] font-bold tracking-[-0.5px] text-[var(--text-h)]">
              New Releases
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {[-1, 1].map((dir) => (
              <button
                key={dir}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-h)] backdrop-blur-xl transition-[background,border-color,color] hover:border-purple-400/40 hover:bg-purple-400/18 hover:text-purple-400"
                onClick={() => scrollReleases(dir)}
                aria-label={dir === -1 ? 'Scroll left' : 'Scroll right'}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {dir === -1 ? (
                    <polyline points="15 18 9 12 15 6" />
                  ) : (
                    <polyline points="9 18 15 12 9 6" />
                  )}
                </svg>
              </button>
            ))}
            <button className="shrink-0 cursor-pointer border-none bg-transparent p-1 text-[13px] font-semibold tracking-[0.3px] text-purple-400 transition-opacity hover:opacity-75">
              View All
            </button>
          </div>
        </div>

        <div
          ref={releasesRef}
          className="-mt-2 flex [scroll-snap-type:x_mandatory] gap-[18px] overflow-x-auto scroll-smooth pt-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {newReleases.map((product) => {
            const hue = CATEGORY_HUE[product.category] ?? 280
            const availableStock = parseInt(product.available_stock ?? product.stock ?? 0)
            const outOfStock = availableStock === 0
            return (
              <div
                key={product.id}
                className="flex w-[210px] shrink-0 [scroll-snap-align:start] flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl transition-[box-shadow,transform,border-color] duration-[250ms] hover:-translate-y-1 hover:border-purple-400/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.15),0_0_0_1px_rgba(192,132,252,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]"
              >
                <div
                  className="relative flex aspect-[2/3] w-full items-center justify-center border-b border-[var(--glass-border)]"
                  style={{
                    background: `linear-gradient(160deg, hsl(${hue},35%,var(--cat-bg-l,10%)) 0%, hsl(${hue},50%,var(--cat-bg-l2,20%)) 100%)`,
                  }}
                >
                  <span
                    className="text-[56px] font-bold opacity-40 select-none"
                    style={{ color: `hsl(${hue},70%,var(--cat-text-l,70%))` }}
                  >
                    {product.name[0]}
                  </span>
                </div>
                <div className="flex flex-col gap-[3px] px-3.5 pt-3 pb-3.5">
                  <span className="text-[11px] font-semibold tracking-[1.5px] text-[var(--text)] uppercase">
                    {product.category}
                  </span>
                  <span className="text-[13px] leading-[1.3] font-semibold text-[var(--text-h)]">
                    {product.name}
                  </span>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[15px] font-bold text-purple-400">
                      ${parseFloat(product.price).toFixed(2)}
                    </span>
                    <button
                      className={
                        outOfStock
                          ? 'flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border border-[var(--border)] bg-transparent text-[var(--text)] opacity-30'
                          : 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text)] transition-[background,color,border-color] hover:border-purple-400 hover:bg-purple-400 hover:text-white'
                      }
                      aria-label="Add to cart"
                      disabled={outOfStock}
                      onClick={() => !outOfStock && onAddToCart && onAddToCart(product)}
                    >
                      <MiniCartIcon />
                    </button>
                  </div>
                  <span
                    className={
                      availableStock < 10
                        ? 'text-[11px] font-semibold text-red-400'
                        : 'text-[11px] text-[var(--text)] opacity-50'
                    }
                  >
                    {availableStock === 0
                      ? 'Out of stock'
                      : availableStock < 10
                        ? `Only ${availableStock} left`
                        : `${availableStock} in stock`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Reviews marquee ── */}
      <section className={sectionCls}>
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="m-0 mb-1.5 text-[11px] font-bold tracking-[4px] text-purple-400 uppercase">
              Testimonials
            </p>
            <h2 className="m-0 text-[28px] font-bold tracking-[-0.5px] text-[var(--text-h)]">
              What Our Customers Say
            </h2>
          </div>
        </div>

        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_5%,black_95%,transparent_100%)]">
          <div className="animate-marquee flex w-max gap-4 hover:[animation-play-state:paused]">
            {[...REVIEWS, ...REVIEWS].map((review, i) => (
              <div
                key={i}
                className="flex w-[280px] shrink-0 flex-col gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow)] backdrop-blur-xl"
              >
                <StarRating rating={review.rating} />
                <p className="m-0 flex-1 text-[13px] leading-relaxed text-[var(--text)]">
                  "{review.text}"
                </p>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-400/12 text-[13px] font-bold text-purple-400">
                    {review.name[0]}
                  </div>
                  <div>
                    <p className="m-0 text-[13px] font-semibold text-[var(--text-h)]">
                      {review.name}
                    </p>
                    <p className="m-0 text-[11px] text-[var(--text)]">Verified Purchase</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
