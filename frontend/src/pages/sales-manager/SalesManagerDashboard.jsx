import { useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import PriceManagement from './PriceManagement'

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.')
    if (parts.length < 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

const sections = [{ key: 'products', label: 'Products', icon: <PriceTagIcon /> }]

export default function SalesManagerDashboard({ token, onLogout }) {
  const [activeSection, setActiveSection] = useState('products')
  const email = decodeJwtPayload(token)?.email

  return (
    <DashboardLayout
      title="FIER Sales Manager"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={onLogout}
      userEmail={email}
    >
      {activeSection === 'products' && <PriceManagement token={token} />}
    </DashboardLayout>
  )
}

function PriceTagIcon() {
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
