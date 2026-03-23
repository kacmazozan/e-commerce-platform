import { useState } from 'react'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import HomePage from './pages/home/HomePage'
import CartPage from './pages/cart/CartPage'
import WishlistPage from './pages/wishlist/WishlistPage'
import './App.css'

function App() {
  const [token, setToken] = useState('dev')
  const [page, setPage] = useState('login')
  const [view, setView] = useState('home')

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

  return (
    <HomePage
      onNavigate={setView}
      onLogout={() => { setToken(null); setPage('login'); setView('home') }}
    />
  )
}

export default App
