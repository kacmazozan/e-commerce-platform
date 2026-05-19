import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import SMOverview from './SMOverview'
import PriceManagement from './PriceManagement'
import DiscountManagement from './DiscountManagement'
import SMInvoices from './SMInvoices'
import RefundsManagement from './RefundsManagement'
import { decodeJwtPayload } from '../../utils/jwt'

const sections = [
  { key: 'overview', label: 'Overview', icon: <OverviewIcon /> },
  { key: 'products', label: 'Products', icon: <PriceTagIcon /> },
  { key: 'discounts', label: 'Discounts', icon: <DiscountIcon /> },
  { key: 'invoices', label: 'Invoices', icon: <InvoiceIcon /> },
  { key: 'refunds', label: 'Refunds', icon: <RefundIcon /> },
]

const validKeys = sections.map((s) => s.key)

export default function SalesManagerDashboard({ token, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [activeSection, setActiveSection] = useState(
    validKeys.includes(initialTab) ? initialTab : 'overview'
  )
  const email = decodeJwtPayload(token)?.email

  function handleSectionChange(key) {
    setActiveSection(key)
    setSearchParams({ tab: key }, { replace: true })
  }

  return (
    <DashboardLayout
      title="FIER Sales Manager"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      onLogout={onLogout}
      userEmail={email}
    >
      {activeSection === 'overview' && (
        <SMOverview token={token} onNavigate={handleSectionChange} />
      )}
      {activeSection === 'products' && <PriceManagement token={token} />}
      {activeSection === 'discounts' && <DiscountManagement token={token} />}
      {activeSection === 'invoices' && <SMInvoices token={token} />}
      {activeSection === 'refunds' && <RefundsManagement token={token} />}
    </DashboardLayout>
  )
}

function OverviewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
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

function DiscountIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  )
}

function InvoiceIcon() {
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

function RefundIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
    </svg>
  )
}
