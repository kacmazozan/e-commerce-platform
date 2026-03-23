import { useState } from 'react'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import HomePage from './pages/home/HomePage'
import CartPage from './pages/cart/CartPage'
import WishlistPage from './pages/wishlist/WishlistPage'
import CategoryPage from './pages/category/CategoryPage'
import AccountSettingsPage from './pages/account/AccountSettingsPage'
import OrdersPage from './pages/orders/OrdersPage'
import HelpPage from './pages/help/HelpPage'
import './App.css'

function App() {
  const [token, setToken] = useState('dev')
  const [page, setPage] = useState('login')
  const [view, setView] = useState('home')
  const [selectedCategory, setSelectedCategory] = useState(null)

  function handleNavigate(nextView, data) {
    if (nextView === 'category') setSelectedCategory(data)
    setView(nextView)
  }

  if (!token) {
    if (page === 'register') {
      return <RegisterPage onBack={() => setPage('login')} />
    }
    if (page === 'forgot-password') {
      return <ForgotPasswordPage onBack={() => setPage('login')} />
    }
    return (
      <LoginPage
        onLogin={setToken}
        onRegister={() => setPage('register')}
        onForgotPassword={() => setPage('forgot-password')}
      />
    )
  }

  if (view === 'cart') {
    return <CartPage onBack={() => setView('home')} />
  }

  if (view === 'wishlist') {
    return <WishlistPage onBack={() => setView('home')} />
  }

  if (view === 'category') {
    return <CategoryPage category={selectedCategory} onBack={() => setView('home')} />
  }

  if (view === 'account-settings') {
    return <AccountSettingsPage onBack={() => setView('home')} />
  }

  if (view === 'orders') {
    return <OrdersPage onBack={() => setView('home')} />
  }

  if (view === 'help') {
    return <HelpPage onBack={() => setView('home')} />
  }

  return (
    <HomePage
      onNavigate={handleNavigate}
      onLogout={() => { setToken(null); setPage('login'); setView('home') }}
    />
  )
}

export default App
