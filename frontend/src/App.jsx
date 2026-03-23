import { useState } from 'react'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import HomePage from './HomePage'
import CartPage from './CartPage'
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

  return (
    <HomePage
      onNavigate={setView}
      onLogout={() => { setToken(null); setPage('login'); setView('home') }}
    />
  )
}

export default App
