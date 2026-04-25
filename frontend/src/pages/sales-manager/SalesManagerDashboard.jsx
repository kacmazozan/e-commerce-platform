import { useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import PriceManagement from './PriceManagement'
import DiscountManagement from './DiscountManagement'
import SMInvoices from './SMInvoices'
import { decodeJwtPayload } from '../../utils/jwt'

const sections = [
  { key: 'products', label: 'Products', icon: <PriceTagIcon /> },
  { key: 'discounts', label: 'Discounts', icon: <DiscountIcon /> },
  { key: 'invoices', label: 'Invoices', icon: <InvoiceIcon /> },
]

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
      {activeSection === 'discounts' && <DiscountManagement token={token} />}
      {activeSection === 'invoices' && <SMInvoices token={token} />}
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
