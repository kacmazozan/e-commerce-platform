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
import SalesManagerLoginPage from './pages/sales-manager/SalesManagerLoginPage'
import SalesManagerDashboard from './pages/sales-manager/SalesManagerDashboard'

function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  useEffect(() => {
    if (navType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navType])
  return null
}
import AdminDashboard from './pages/admin/AdminDashboard'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import HomePage from './pages/home/HomePage'
import CartPage from './pages/cart/CartPage'
import WishlistPage from './pages/wishlist/WishlistPage'
import CategoryPage from './pages/category/CategoryPage'
import AccountSettingsPage from './pages/account/AccountSettingsPage'
import OrdersPage from './pages/orders/OrdersPage'
import HelpPage from './pages/help/HelpPage'

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

function RequireSalesManager({ salesManagerToken, children }) {
  if (!salesManagerToken) return <Navigate to="/sales-manager/login" replace />
  const payload = decodeJwtPayload(salesManagerToken)
  if (!payload || payload.role !== 'sales_manager')
    return <Navigate to="/sales-manager/login" replace />
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
  const [salesManagerToken, setSalesManagerToken] = useState(() =>
    localStorage.getItem('salesManagerToken')
  )
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
    localStorage.setItem('guest_cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem('guest_wishlist', JSON.stringify(wishlist))
  }, [wishlist])

  function addToCart(product) {
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

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((item) => item.id !== productId))
  }

  function updateCartQuantity(productId, quantity) {
    if (quantity < 1) {
      removeFromCart(productId)
      return
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

  function handleLogin(t) {
    const payload = decodeJwtPayload(t)
    if (!payload) {
      localStorage.removeItem('token')
      return
    }
    localStorage.setItem('token', t)
    setToken(t)
    setUser({ email: payload.email })
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

  function handleSalesManagerLogin(t) {
    localStorage.setItem('salesManagerToken', t)
    setSalesManagerToken(t)
    navigate('/sales-manager')
  }

  function handleSalesManagerLogout() {
    localStorage.removeItem('salesManagerToken')
    setSalesManagerToken(null)
    navigate('/sales-manager/login')
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
              onLogout={() => {
                localStorage.removeItem('token')
                setToken(null)
                setUser(null)
                navigate('/')
              }}
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
        <Route path="/register" element={<RegisterPage onBack={() => navigate('/login')} />} />
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
            />
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

        {/* Sales manager routes */}
        <Route
          path="/sales-manager/login"
          element={
            salesManagerToken ? (
              <Navigate to="/sales-manager" replace />
            ) : (
              <SalesManagerLoginPage onLogin={handleSalesManagerLogin} />
            )
          }
        />
        <Route
          path="/sales-manager"
          element={
            <RequireSalesManager salesManagerToken={salesManagerToken}>
              <SalesManagerDashboard onLogout={handleSalesManagerLogout} />
            </RequireSalesManager>
          }
        />

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
