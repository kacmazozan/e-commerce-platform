import { useState, useEffect } from 'react'
import API_BASE from '../../api'
import UserManagement from './UserManagement'
import ProductManagement from './ProductManagement'
import OrderManagement from './OrderManagement'
import SettingsManagement from './SettingsManagement'
import DashboardHome from './DashboardHome'
import DashboardLayout from '../../components/DashboardLayout'

function AdminDashboard({ token, onLogout }) {
  const [admin, setAdmin] = useState(null)
  const [activeSection, setActiveSection] = useState('dashboard')

  useEffect(() => {
    async function fetchAdmin() {
      try {
        const res = await fetch(`${API_BASE}/api/admin/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          onLogout()
          return
        }
        const data = await res.json()
        setAdmin(data.user)
      } catch {
        onLogout()
      }
    }
    fetchAdmin()
  }, [token, onLogout])

  const sections = [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { key: 'users', label: 'Users', icon: <UsersIcon /> },
    { key: 'products', label: 'Products', icon: <ProductsIcon /> },
    { key: 'orders', label: 'Orders', icon: <OrdersIcon /> },
    { key: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ]

  return (
    <DashboardLayout
      title="FIER Admin"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={onLogout}
      userEmail={admin?.email}
    >
      {activeSection === 'dashboard' && (
        <DashboardHome token={token} onNavigate={setActiveSection} />
      )}
      {activeSection === 'users' && <UserManagement token={token} />}
      {activeSection === 'products' && <ProductManagement token={token} />}
      {activeSection === 'orders' && <OrderManagement token={token} />}
      {activeSection === 'settings' && <SettingsManagement token={token} />}
    </DashboardLayout>
  )
}

/* Inline SVG icons — nav-section specific, stay with AdminDashboard */

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

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export default AdminDashboard
