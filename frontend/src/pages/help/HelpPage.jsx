import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

/* ── FAQ data ─────────────────────────────────────────────── */

const FAQ_CATEGORIES = [
  {
    id: 'products',
    label: 'Products',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    items: [
      {
        q: 'What sizes do you offer?',
        a: 'We offer sizes XS through 3XL across most of our ranges. Specific size availability varies by product — check the size selector on each product page. Our activewear and denim lines also include a detailed fit guide.',
      },
      {
        q: 'How do I find the right size?',
        a: "Each product page includes a Size Guide button with our full measurement chart. We recommend measuring your chest, waist, and hips and comparing against the guide. If you're between sizes, we generally suggest sizing up for a relaxed fit or sizing down for a tailored look.",
      },
      {
        q: 'Are your products ethically made?',
        a: 'Yes. All FIER suppliers are audited against our Code of Conduct, which requires fair wages, safe working conditions, and no forced or child labour. We publish our full supplier list on our Sustainability page and are working towards B Corp certification.',
      },
      {
        q: 'How should I care for my garments?',
        a: 'Care instructions are printed on the label of every garment and listed on the product page. As a general rule, washing at 30°C and air-drying preserves colour and shape best. Delicate fabrics such as silk and fine knits should be hand-washed or dry-cleaned.',
      },
      {
        q: 'Can I see more photos of a product?',
        a: "Each product page includes multiple photography angles and, where available, on-model shots across different sizes. If you'd like additional views, our customer service team can often provide extra images on request.",
      },
      {
        q: 'Do you restock sold-out items?',
        a: 'Popular items are restocked periodically. Use the "Notify Me" button on any sold-out product page and we\'ll email you the moment it\'s back. You can also follow us on Instagram where we announce restock drops.',
      },
    ],
  },
  {
    id: 'returns',
    label: 'Returns & Exchanges',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
      </svg>
    ),
    items: [
      {
        q: 'What is your return policy?',
        a: 'We accept returns within 30 days of delivery. Items must be unworn, unwashed, and in their original packaging with tags attached. Sale items marked "Final Sale" cannot be returned. Gift cards are non-refundable.',
      },
      {
        q: 'How do I start a return?',
        a: 'Log in to your account, go to My Orders, and select the order you\'d like to return. Click "Start Return", choose your items and reason, then print or download your prepaid returns label. Drop the parcel at any post office or designated drop-off point.',
      },
      {
        q: 'Can I exchange an item for a different size or colour?',
        a: 'Yes. During the return process, select "Exchange" instead of "Refund". Choose your preferred size or colour and we\'ll ship the replacement as soon as we receive your original item — typically within 2–3 business days of receipt.',
      },
      {
        q: 'Do I have to pay for return shipping?',
        a: 'Returns are free for all UK orders. International customers are responsible for return postage costs, which will be deducted from the refund amount. We recommend using a tracked service as we cannot be held responsible for parcels lost in transit.',
      },
      {
        q: 'What if my item arrives damaged or incorrect?',
        a: "We're sorry to hear that! Please contact us within 48 hours of delivery via the Help & Support chat or by emailing support@fier.com. Attach photos of the issue and your order number, and we'll arrange a free replacement or full refund straight away.",
      },
    ],
  },
  {
    id: 'payment',
    label: 'Payment & Refunds',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    items: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept Visa, Mastercard, American Express, PayPal, Apple Pay, Google Pay, and Klarna (Buy Now, Pay Later in 3 interest-free instalments). All payments are processed securely through our payment partner Stripe.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Absolutely. We never store your full card details on our servers. All transactions are encrypted with TLS and processed by Stripe, which is PCI DSS Level 1 certified — the highest standard of payment security available.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Once we receive and inspect your return (usually 2–3 business days), refunds are issued within 24 hours. The time for funds to appear in your account depends on your bank — typically 3–5 business days for cards, and 1–2 business days for PayPal.',
      },
      {
        q: 'Can I use a discount code and a sale price together?',
        a: 'Discount codes can be applied to full-price items only and cannot be combined with other promotions or sale prices unless explicitly stated. Some codes have minimum spend requirements — check the terms when the code was issued.',
      },
      {
        q: 'When will I be charged?',
        a: 'Your card is charged immediately when you place your order. If an item is unavailable after you order, you will receive a full refund to your original payment method within 3–5 business days.',
      },
      {
        q: 'How does Klarna work?',
        a: "Klarna lets you split your purchase into 3 equal interest-free payments. The first is taken at checkout; the remaining two are billed automatically every 30 days. A soft credit check may be performed, which doesn't affect your credit score.",
      },
    ],
  },
  {
    id: 'orders',
    label: 'Orders & Shipping',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    items: [
      {
        q: 'How do I track my order?',
        a: "Once your order ships, you'll receive a confirmation email with your tracking number and a link to the carrier's tracking page. You can also view live tracking under My Orders in your account — we show each step from dispatch through to delivery.",
      },
      {
        q: 'How long does delivery take?',
        a: 'Standard UK delivery takes 3–5 business days. Express delivery (next business day if ordered before 1 pm) is available at checkout. International orders typically arrive within 5–10 business days depending on destination and customs clearance.',
      },
      {
        q: 'Do you offer free shipping?',
        a: 'Yes — standard shipping is free on all UK orders over £50. Orders below £50 incur a £3.99 shipping fee. Express shipping is £6.99 regardless of order value. International shipping rates are calculated at checkout based on destination.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'We ship to over 40 countries across Europe, North America, Australia, and parts of Asia. International orders may be subject to import duties and taxes, which are the responsibility of the recipient. Estimated duties are shown at checkout where applicable.',
      },
      {
        q: 'Can I change or cancel my order?',
        a: 'Orders can be amended or cancelled within 1 hour of being placed, before they enter our fulfilment system. Go to My Orders and select "Cancel Order" or contact support immediately. Once dispatched, orders cannot be cancelled — you\'ll need to return the item instead.',
      },
      {
        q: "What happens if I'm not in when my parcel arrives?",
        a: 'The carrier will leave a card with instructions to rearrange delivery, redirect to a neighbour, or collect from a local depot or parcel locker. Most carriers also provide a link in the delivery notification email to manage your delivery preferences.',
      },
    ],
  },
  {
    id: 'company',
    label: 'Company',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    items: [
      {
        q: 'Who is FIER?',
        a: "FIER is a contemporary fashion brand founded with a simple belief: great style shouldn't come at the cost of quality or conscience. We design versatile, considered clothing for everyday life — made to last and meant to be worn.",
      },
      {
        q: 'Where are you based?',
        a: 'FIER is headquartered in London, UK. Our design studio is in Shoreditch, and our primary fulfilment centre operates out of the East Midlands. We work with manufacturing partners across Portugal, Italy, and Turkey.',
      },
      {
        q: 'Do you have any physical stores?',
        a: 'Currently FIER is an online-only brand. We do host occasional pop-up events in London and Manchester — follow us on Instagram or sign up to our newsletter to be notified of upcoming dates.',
      },
      {
        q: 'How can I contact customer support?',
        a: 'Our support team is available Monday–Friday 9 am–6 pm GMT. You can reach us via the live chat on this page, by emailing support@fier.com, or by calling +44 20 1234 5678. We aim to respond to all queries within 4 business hours.',
      },
      {
        q: 'Do you have a loyalty programme?',
        a: 'Yes! FIER Rewards lets you earn 1 point for every £1 spent. Points can be redeemed against future orders (100 points = £1 off). Members also get early access to sales, birthday discounts, and exclusive new-arrival previews. Enrol free in your account settings.',
      },
      {
        q: 'How do I stay up to date with new collections?',
        a: 'Subscribe to our newsletter for weekly new-arrival edits, style guides, and exclusive member offers. You can also follow @fierofficial on Instagram, TikTok, and Pinterest for daily inspiration and behind-the-scenes content.',
      },
    ],
  },
]

/* ── Icons ────────────────────────────────────────────────── */

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

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

/* ── Accordion item ──────────────────────────────────────── */

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border-b border-[var(--border)] last:border-b-0${open ? ' faq-open' : ''}`}>
      <button
        className={`flex w-full cursor-pointer items-center justify-between gap-4 border-none bg-transparent px-5 py-[18px] text-left text-sm font-semibold transition-colors ${open ? 'bg-purple-400/12 text-purple-400' : 'text-[var(--text-h)] hover:bg-[var(--border)]'}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <span
          className={`ease flex shrink-0 items-center transition-transform duration-250 ${open ? 'rotate-180 text-purple-400' : 'text-[var(--text)]'}`}
        >
          <ChevronDownIcon />
        </span>
      </button>
      {open && (
        <div className="animate-[faq-expand_0.2s_ease] bg-[var(--bg)] px-5 pb-[18px]">
          <p className="m-0 border-t border-[var(--border)] pt-4 text-sm leading-[1.75] text-[var(--text)]">
            {answer}
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────── */

export default function HelpPage({ onBack }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return FAQ_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      ),
    })).filter(
      (cat) => (activeCategory === 'all' || cat.id === activeCategory) && cat.items.length > 0
    )
  }, [search, activeCategory])

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

      {/* Hero */}
      <div className="flex flex-col items-center gap-3 bg-[linear-gradient(135deg,var(--bg)_0%,var(--bg-gradient-to)_50%,var(--accent-bg)_100%)] px-6 py-16 text-center">
        <p className="m-0 text-[11px] font-bold tracking-[5px] text-purple-400 uppercase">
          Support
        </p>
        <h1 className="m-0 text-[48px] leading-[1.1] font-extrabold tracking-[-1.5px] text-[var(--text-h)] max-[600px]:text-[34px]">
          How can we help?
        </h1>
        <p className="m-0 mb-2 text-[15px] text-[var(--text)] opacity-80">
          Browse answers below, or search for a specific topic.
        </p>
        <div className="relative mt-1 w-full max-w-[520px]">
          <span className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 text-[var(--text)] opacity-50">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Search FAQs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search FAQs"
            className="box-border w-full rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] py-3.5 pr-11 pl-11 text-[15px] text-[var(--text-h)] transition-colors outline-none placeholder:text-[var(--text)]/40 focus:border-purple-400 focus:bg-[var(--bg)]"
          />
          {search && (
            <button
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer border-none bg-none p-1 text-[20px] leading-none text-[var(--text)] transition-colors hover:text-[var(--text-h)]"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto box-border w-full max-w-[860px] px-6 pt-12 pb-20">
        {/* Category tabs */}
        <div className="mb-10 flex flex-wrap gap-2">
          <button
            className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${activeCategory === 'all' ? 'border-purple-400 bg-purple-400 text-white hover:text-white' : 'border-[var(--border)] bg-transparent text-[var(--text)] hover:border-purple-400 hover:text-[var(--text-h)]'}`}
            onClick={() => setActiveCategory('all')}
          >
            All Topics
          </button>
          {FAQ_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${activeCategory === cat.id ? 'border-purple-400 bg-purple-400 text-white hover:text-white' : 'border-[var(--border)] bg-transparent text-[var(--text)] hover:border-purple-400 hover:text-[var(--text-h)]'}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ sections */}
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="m-0 mb-2 text-[18px] font-semibold text-[var(--text-h)]">
              No results for &ldquo;{search}&rdquo;
            </p>
            <p className="m-0 text-sm text-[var(--text)]">
              Try different keywords, or{' '}
              <button
                className="cursor-pointer border-none bg-none p-0 text-sm text-purple-400 underline underline-offset-[3px]"
                onClick={() => setSearch('')}
              >
                clear your search
              </button>
              .
            </p>
          </div>
        ) : (
          filtered.map((cat) => (
            <section key={cat.id} className="mb-12">
              <div className="mb-4 flex items-center gap-2.5 border-b-2 border-purple-400 pb-3.5">
                <span className="flex items-center text-purple-400">{cat.icon}</span>
                <h2 className="m-0 text-[19px] font-bold text-[var(--text-h)]">{cat.label}</h2>
              </div>
              <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl">
                {cat.items.map((item, i) => (
                  <FaqItem key={i} question={item.q} answer={item.a} />
                ))}
              </div>
            </section>
          ))
        )}

        {/* Contact strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-6 rounded-[14px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg)_0%,var(--bg-gradient-to)_50%,var(--accent-bg)_100%)] px-8 py-7 max-[600px]:flex-col max-[600px]:items-start max-[600px]:px-6">
          <div>
            <p className="m-0 mb-1 text-[17px] font-bold text-[var(--text-h)]">Still need help?</p>
            <p className="m-0 text-[13px] text-[var(--text)] opacity-70">
              Our support team is available Monday–Friday, 9 am–6 pm GMT.
            </p>
          </div>
          <div className="flex shrink-0 gap-2.5">
            <button className="cursor-pointer rounded-lg border border-purple-400 bg-purple-400 px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85">
              Live Chat
            </button>
            <button className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-5 py-2.5 text-[13px] font-semibold text-[var(--text-h)] transition-opacity hover:opacity-85">
              Email Us
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
