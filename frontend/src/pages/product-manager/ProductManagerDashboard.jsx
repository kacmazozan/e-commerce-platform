import { useState, useEffect } from 'react'
import API_BASE from '../../api'
import { decodeJwtPayload } from '../../utils/jwt'
import DashboardLayout from '../../components/DashboardLayout'
import PMProducts from './PMProducts'
import PMCategories from './PMCategories'
import PMInventory from './PMInventory'
import PMOrders from './PMOrders'
import PMDeliveries from './PMDeliveries'
import PMComments from './PMComments'
import './ProductManagerDashboard.css'

const PM_API = `${API_BASE}/api/product-manager`

function PMOverview({ token, onNavigate }) {
  const [stats, setStats] = useState({ products: 0, orders: 0, lowStock: 0, categories: 0 })

  useEffect(() => {
    async function fetchStats() {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [pRes, oRes, cRes] = await Promise.all([
          fetch(`${PM_API}/products?page=1&limit=1`, { headers }),
          fetch(`${PM_API}/orders?page=1&limit=1`, { headers }),
          fetch(`${PM_API}/categories`, { headers }),
        ])
        const pData = pRes.ok ? await pRes.json() : {}
        const oData = oRes.ok ? await oRes.json() : {}
        const cData = cRes.ok ? await cRes.json() : {}

        const lsRes = await fetch(`${PM_API}/products?page=1&limit=1&lowStock=true`, { headers })
        const lsData = lsRes.ok ? await lsRes.json() : {}

        setStats({
          products: pData.pagination?.total ?? 0,
          orders: oData.pagination?.total ?? 0,
          lowStock: lsData.pagination?.total ?? 0,
          categories: cData.categories?.length ?? 0,
        })
      } catch {
        // stats stay at 0
      }
    }
    fetchStats()
  }, [token])

  return (
    <div className="mb-7 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
      <button
        className="flex cursor-pointer flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-5 py-6 text-left font-[inherit] shadow-[var(--shadow)] transition-all duration-150 hover:border-purple-400 hover:bg-purple-400/12"
        onClick={() => onNavigate('products')}
      >
        <span className="text-[28px] font-semibold tracking-tight text-[var(--text-h)]">
          {stats.products}
        </span>
        <span className="text-[13px] tracking-wide text-[var(--text)] uppercase opacity-70">
          Total Products
        </span>
      </button>
      <button
        className="flex cursor-pointer flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-5 py-6 text-left font-[inherit] shadow-[var(--shadow)] transition-all duration-150 hover:border-purple-400 hover:bg-purple-400/12"
        onClick={() => onNavigate('categories')}
      >
        <span className="text-[28px] font-semibold tracking-tight text-[var(--text-h)]">
          {stats.categories}
        </span>
        <span className="text-[13px] tracking-wide text-[var(--text)] uppercase opacity-70">
          Total Categories
        </span>
      </button>
      <button
        className="flex cursor-pointer flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-5 py-6 text-left font-[inherit] shadow-[var(--shadow)] transition-all duration-150 hover:border-purple-400 hover:bg-purple-400/12"
        onClick={() => onNavigate('inventory')}
      >
        <span className="text-[28px] font-semibold tracking-tight text-[var(--text-h)]">
          {stats.lowStock}
        </span>
        <span className="text-[13px] tracking-wide text-[var(--text)] uppercase opacity-70">
          Low / Out of Stock
        </span>
      </button>
      <button
        className="flex cursor-pointer flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-5 py-6 text-left font-[inherit] shadow-[var(--shadow)] transition-all duration-150 hover:border-purple-400 hover:bg-purple-400/12"
        onClick={() => onNavigate('orders')}
      >
        <span className="text-[28px] font-semibold tracking-tight text-[var(--text-h)]">
          {stats.orders}
        </span>
        <span className="text-[13px] tracking-wide text-[var(--text)] uppercase opacity-70">
          Total Orders
        </span>
      </button>
    </div>
  )
}

function ProductManagerDashboard({ token, onLogout }) {
  const tokenPayload = decodeJwtPayload(token)
  const [pmUser, setPmUser] = useState(tokenPayload ? { email: tokenPayload.email } : null)
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`${PM_API}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401 || res.status === 403) {
          onLogout()
          return
        }
        if (res.ok) {
          const data = await res.json()
          setPmUser(data.user)
        }
        // 404 / 500 = endpoint not yet implemented — stay on dashboard using token data
      } catch {
        // network error — stay on dashboard, don't force logout
      }
    }
    fetchUser()
  }, [token, onLogout])

  const sections = [
    { key: 'overview', label: 'Overview', icon: <DashboardIcon /> },
    { key: 'products', label: 'Products', icon: <ProductsIcon /> },
    { key: 'categories', label: 'Categories', icon: <CategoriesIcon /> },
    { key: 'inventory', label: 'Inventory', icon: <InventoryIcon /> },
    { key: 'orders', label: 'Orders', icon: <OrdersIcon /> },
    { key: 'deliveries', label: 'Deliveries', icon: <DeliveriesIcon /> },
    { key: 'comments', label: 'Comments', icon: <CommentsIcon /> },
  ]

  return (
    <DashboardLayout
      title="MODÉ Manager"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={onLogout}
      userEmail={pmUser?.email}
    >
      {activeSection === 'overview' && <PMOverview token={token} onNavigate={setActiveSection} />}
      {activeSection === 'products' && <PMProducts token={token} />}
      {activeSection === 'categories' && <PMCategories token={token} />}
      {activeSection === 'inventory' && <PMInventory token={token} />}
      {activeSection === 'orders' && <PMOrders token={token} />}
      {activeSection === 'deliveries' && <PMDeliveries token={token} />}
      {activeSection === 'comments' && <PMComments token={token} />}
    </DashboardLayout>
  )
}

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function ProductsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function CategoriesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function InventoryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 20h20" />
      <path d="M5 20V8l7-5 7 5v12" />
      <path d="M9 20v-5h6v5" />
    </svg>
  )
}

function OrdersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function DeliveriesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

function CommentsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export default ProductManagerDashboard
