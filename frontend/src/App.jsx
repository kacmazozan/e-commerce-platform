import { useState, useEffect } from 'react'
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useNavigationType,
} from 'react-router-dom'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import HomePage from './pages/home/HomePage'
import CartPage from './pages/cart/CartPage'
import CheckoutPage from './pages/checkout/CheckoutPage'
import WishlistPage from './pages/wishlist/WishlistPage'
import CategoryPage from './pages/category/CategoryPage'
import AccountSettingsPage from './pages/account/AccountSettingsPage'
import OrdersPage from './pages/orders/OrdersPage'
import HelpPage from './pages/help/HelpPage'
import API_BASE from './api'

function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  useEffect(() => {
    if (navType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navType])
  return null
}

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

function RequireAuth({ token, children }) {
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ adminToken, children }) {
  if (!adminToken) return <Navigate to="/admin/login" replace />

  const payload = decodeJwtPayload(adminToken)
  if (!payload || payload.role !== 'admin') return <Navigate to="/admin/login" replace />

  return children
}

function CategoryRoute({
  onAddToCart,
  onRemoveFromCart,
  onAddToWishlist,
  onRemoveFromWishlist,
  cartItems,
  wishlistItems,
}) {
  const { state } = useLocation()
  const navigate = useNavigate()

  if (!state?.category) {
    return <Navigate to="/" replace />
  }

  return (
    <CategoryPage
      category={state.category}
      onBack={() => navigate(-1)}
      onAddToCart={onAddToCart}
      onRemoveFromCart={onRemoveFromCart}
      onAddToWishlist={onAddToWishlist}
      onRemoveFromWishlist={onRemoveFromWishlist}
      cartItems={cartItems}
      wishlistItems={wishlistItems}
    />
  )
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('token')
    if (!t) return null
    const payload = decodeJwtPayload(t)
    if (!payload) {
      localStorage.removeItem('token')
      return null
    }
    return { email: payload.email }
  })

  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken'))
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('guest_cart') || '[]')
    } catch {
      return []
    }
  })
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('guest_wishlist') || '[]')
    } catch {
      return []
    }
  })
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) localStorage.setItem('guest_cart', JSON.stringify(cart))
  }, [cart, token])

  // On mount: if already logged in, load cart from server
  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/api/cart`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setCart(data.items)
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem('guest_wishlist', JSON.stringify(wishlist))
  }, [wishlist])

  async function addToCart(product) {
    if (token) {
      const res = await fetch(`${API_BASE}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      }).catch(() => null)
      const data = await res?.json().catch(() => null)
      if (data?.items) {
        setCart(data.items)
        return
      }
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }]
    })
  }

  async function removeFromCart(productId) {
    if (token) {
      const res = await fetch(`${API_BASE}/api/cart/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null)
      const data = await res?.json().catch(() => null)
      if (data?.items) {
        setCart(data.items)
        return
      }
    }
    setCart((prev) => prev.filter((item) => item.id !== productId))
  }

  async function updateCartQuantity(productId, quantity) {
    if (quantity < 1) {
      removeFromCart(productId)
      return
    }
    if (token) {
      const res = await fetch(`${API_BASE}/api/cart/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity }),
      }).catch(() => null)
      const data = await res?.json().catch(() => null)
      if (data?.items) {
        setCart(data.items)
        return
      }
    }
    setCart((prev) => prev.map((item) => (item.id === productId ? { ...item, quantity } : item)))
  }

  function addToWishlist(product) {
    setWishlist((prev) => {
      if (prev.find((item) => item.id === product.id)) return prev
      return [...prev, { id: product.id, name: product.name, price: product.price }]
    })
  }

  function removeFromWishlist(productId) {
    setWishlist((prev) => prev.filter((item) => item.id !== productId))
  }

  async function handleLogin(t) {
    const payload = decodeJwtPayload(t)
    if (!payload) {
      localStorage.removeItem('token')
      return
    }
    localStorage.setItem('token', t)

    // Login: discard guest cart and load the server cart
    const res = await fetch(`${API_BASE}/api/cart`, {
      headers: { Authorization: `Bearer ${t}` },
    }).catch(() => null)
    const data = await res?.json().catch(() => null)

    setToken(t)
    setUser({ email: payload.email })
    if (data?.items) {
      localStorage.removeItem('guest_cart')
      setCart(data.items)
    }
    navigate('/')
  }

  async function handleSignup(t) {
    const payload = decodeJwtPayload(t)
    if (!payload) return
    localStorage.setItem('token', t)

    // Signup: merge guest cart items into the new (empty) server cart
    const guestItems = cart.filter((item) => item.id)
    for (const item of guestItems) {
      await fetch(`${API_BASE}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ productId: item.id, quantity: item.quantity }),
      }).catch(() => {})
    }

    // Fetch the merged cart from the server
    const res = await fetch(`${API_BASE}/api/cart`, {
      headers: { Authorization: `Bearer ${t}` },
    }).catch(() => null)
    const data = await res?.json().catch(() => null)

    setToken(t)
    setUser({ email: payload.email })
    if (data?.items) {
      localStorage.removeItem('guest_cart')
      setCart(data.items)
    }
    navigate('/')
  }

  function handleAdminLogin(t) {
    localStorage.setItem('adminToken', t)
    setAdminToken(t)
    navigate('/admin')
  }

  function handleAdminLogout() {
    localStorage.removeItem('adminToken')
    setAdminToken(null)
    navigate('/admin/login')
  }

  function handleLogout() {
    localStorage.setItem('guest_cart', JSON.stringify(cart))
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    navigate('/')
  }

  function requireAuth() {
    navigate('/login')
  }

  function handleNavigate(nextView, data) {
    if (nextView === 'category') {
      navigate('/category', { state: { category: data } })
    } else {
      navigate('/' + nextView)
    }
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              isLoggedIn={!!token}
              userEmail={user?.email}
              onNavigate={handleNavigate}
              onRequireAuth={requireAuth}
              onLogout={handleLogout}
              cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
              wishlistCount={wishlist.length}
              onAddToCart={addToCart}
            />
          }
        />
        <Route
          path="/login"
          element={
            <LoginPage
              onLogin={handleLogin}
              onRegister={() => navigate('/register')}
              onForgotPassword={() => navigate('/forgot-password')}
            />
          }
        />
        <Route
          path="/register"
          element={<RegisterPage onBack={() => navigate('/login')} onSignup={handleSignup} />}
        />
        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage onBack={() => navigate('/login')} />}
        />
        <Route
          path="/reset-password"
          element={<ResetPasswordPage onBack={() => navigate('/login')} />}
        />
        <Route
          path="/cart"
          element={
            <CartPage
              onBack={() => navigate(-1)}
              cartItems={cart}
              onRemove={removeFromCart}
              onUpdateQuantity={updateCartQuantity}
              isLoggedIn={!!token}
              token={token}
            />
          }
        />
        <Route
          path="/checkout"
          element={
            <RequireAuth token={token}>
              <CheckoutPage
                cartItems={cart}
                token={token}
                onOrderConfirmed={() => {
                  setCart([])
                  navigate('/orders')
                }}
              />
            </RequireAuth>
          }
        />
        <Route
          path="/wishlist"
          element={
            <WishlistPage
              onBack={() => navigate(-1)}
              wishlistItems={wishlist}
              onRemove={removeFromWishlist}
              onAddToCart={addToCart}
            />
          }
        />
        <Route
          path="/category"
          element={
            <CategoryRoute
              onAddToCart={addToCart}
              onRemoveFromCart={removeFromCart}
              onAddToWishlist={addToWishlist}
              onRemoveFromWishlist={removeFromWishlist}
              cartItems={cart}
              wishlistItems={wishlist}
            />
          }
        />
        <Route
          path="/account-settings"
          element={
            <RequireAuth token={token}>
              <AccountSettingsPage onBack={() => navigate(-1)} token={token} />
            </RequireAuth>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireAuth token={token}>
              <OrdersPage onBack={() => navigate(-1)} />
            </RequireAuth>
          }
        />
        <Route path="/help" element={<HelpPage onBack={() => navigate(-1)} />} />

        {/* Admin routes */}
        <Route
          path="/admin/login"
          element={
            adminToken ? (
              <Navigate to="/admin" replace />
            ) : (
              <AdminLoginPage onLogin={handleAdminLogin} />
            )
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin adminToken={adminToken}>
              <AdminDashboard token={adminToken} onLogout={handleAdminLogout} />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
