import { useState, useEffect } from 'react'
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useNavigationType,
  useSearchParams,
  useParams,
} from 'react-router-dom'
import Navbar from './pages/home/components/Navbar'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import SalesManagerLoginPage from './pages/sales-manager/SalesManagerLoginPage'
import SalesManagerDashboard from './pages/sales-manager/SalesManagerDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import HomePage from './pages/home/HomePage'
import CartPage from './pages/cart/CartPage'
import CheckoutPage from './pages/checkout/CheckoutPage'
import OrderSuccessPage from './pages/checkout/OrderSuccessPage'
import WishlistPage from './pages/wishlist/WishlistPage'
import CategoryPage from './pages/category/CategoryPage'
import SearchPage from './pages/search/SearchPage'
import AccountSettingsPage from './pages/account/AccountSettingsPage'
import EmailChangeConfirmPage from './pages/account/EmailChangeConfirmPage'
import OrdersPage from './pages/orders/OrdersPage'
import HelpPage from './pages/help/HelpPage'

import ProductManagerDashboard from './pages/product-manager/ProductManagerDashboard'
import ProductPage from './pages/product/ProductPage'
import API_BASE from './api'
import { decodeJwtPayload } from './utils/jwt'

function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  useEffect(() => {
    if (navType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navType])
  return null
}

function CustomerLayout({
  isLoggedIn,
  userEmail,
  userName,
  token,
  onNavigate,
  onRequireAuth,
  onLogout,
  cartCount,
  wishlistCount,
  children,
}) {
  const [searchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
  return (
    <>
      <Navbar
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        userName={userName}
        token={token}
        onNavigate={onNavigate}
        onRequireAuth={onRequireAuth}
        onLogout={onLogout}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      {children}
    </>
  )
}

function RequireAuth({ token, children }) {
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RequireProductManager({ token, children }) {
  if (!token) return <Navigate to="/login" replace />
  const payload = decodeJwtPayload(token)
  if (!payload || payload.role !== 'product_manager') return <Navigate to="/" replace />
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
  onAddToWishlist,
  onRemoveFromWishlist,
  wishlistItems,
  token,
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
      onAddToWishlist={onAddToWishlist}
      onRemoveFromWishlist={onRemoveFromWishlist}
      wishlistItems={wishlistItems}
      token={token}
    />
  )
}

function ProductRoute({
  onAddToCart,
  onAddToWishlist,
  onRemoveFromWishlist,
  wishlistItems,
  cartItems,
  onUpdateQuantity,
  isLoggedIn,
  userEmail,
  token,
  onNavigate,
  onRequireAuth,
  onLogout,
  cartCount,
  wishlistCount,
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  return (
    <ProductPage
      productId={id}
      onBack={() => navigate(-1)}
      onAddToCart={onAddToCart}
      onAddToWishlist={onAddToWishlist}
      onRemoveFromWishlist={onRemoveFromWishlist}
      wishlistItems={wishlistItems}
      cartItems={cartItems}
      onUpdateQuantity={onUpdateQuantity}
      isLoggedIn={isLoggedIn}
      userEmail={userEmail}
      token={token}
      onNavigate={onNavigate}
      onRequireAuth={onRequireAuth}
      onLogout={onLogout}
      cartCount={cartCount}
      wishlistCount={wishlistCount}
    />
  )
}

function SearchRoute({ onAddToWishlist, onRemoveFromWishlist, wishlistItems }) {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''

  return (
    <SearchPage
      searchQuery={q}
      onAddToWishlist={onAddToWishlist}
      onRemoveFromWishlist={onRemoveFromWishlist}
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
    return { email: payload.email, name: null }
  })

  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken'))
  const [salesManagerToken, setSalesManagerToken] = useState(() => {
    const t = localStorage.getItem('salesManagerToken')
    if (!t) return null
    const payload = decodeJwtPayload(t)
    if (!payload || payload.role !== 'sales_manager') {
      localStorage.removeItem('salesManagerToken')
      return null
    }
    return t
  })
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('guest_cart') || '[]')
    } catch {
      return []
    }
  })
  const [wishlist, setWishlist] = useState(() => {
    // Authenticated users get server data on mount — skip stale guest_wishlist
    // (guest items lack available_stock, causing false out-of-stock display)
    if (localStorage.getItem('token')) return []
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

  // On mount: if already logged in, validate token and load cart and wishlist from server.
  // A 401 here means the token is stale (e.g. DB was reset) — log out immediately so the
  // user is not stuck in a broken "logged in" state with a non-functional session.
  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/api/cart`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('guest_cart')
          localStorage.removeItem('guest_wishlist')
          setToken(null)
          setUser(null)
          setCart([])
          setWishlist([])
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (data?.items) setCart(data.items)
      })
      .catch(() => {})
    fetch(`${API_BASE}/api/wishlist`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.items) setWishlist(data.items)
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) localStorage.setItem('guest_wishlist', JSON.stringify(wishlist))
  }, [wishlist, token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setUser((prev) =>
          prev
            ? { ...prev, email: data.email || prev.email, name: data.name || null }
            : { email: data.email, name: data.name || null }
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token])

  async function addToCart(product, size = '') {
    if (token) {
      const res = await fetch(`${API_BASE}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id, quantity: 1, size }),
      }).catch(() => null)
      const data = await res?.json().catch(() => null)
      if (data?.items) {
        setCart(data.items)
        return
      }
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id && (item.size || '') === size)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id && (item.size || '') === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        { id: product.id, name: product.name, price: product.price, quantity: 1, size },
      ]
    })
  }

  async function removeFromCart(productId, size = '') {
    if (token) {
      // If size is null, we'd need a different endpoint or a loop,
      // but current UI only removes specific variants.
      const sizeParam = size !== null ? `?size=${encodeURIComponent(size || '')}` : ''
      const res = await fetch(`${API_BASE}/api/cart/${productId}${sizeParam}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null)
      const data = await res?.json().catch(() => null)
      if (data?.items) {
        setCart(data.items)
        return
      }
    }
    setCart((prev) =>
      prev.filter((item) => {
        if (item.id !== productId) return true
        if (size === null) return false // Remove all sizes
        return (item.size || '') !== (size || '')
      })
    )
  }

  async function updateCartQuantity(productId, size = '', quantity) {
    if (quantity < 1) {
      removeFromCart(productId, size)
      return
    }
    if (token) {
      const sizeParam = size ? `?size=${encodeURIComponent(size)}` : ''
      const res = await fetch(`${API_BASE}/api/cart/${productId}${sizeParam}`, {
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
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId && (item.size || '') === size ? { ...item, quantity } : item
      )
    )
  }

  async function addToWishlist(product) {
    if (token) {
      const res = await fetch(`${API_BASE}/api/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id }),
      }).catch(() => null)
      const data = await res?.json().catch(() => null)
      if (data?.items) {
        setWishlist(data.items)
        return
      }
    }
    setWishlist((prev) => {
      if (prev.find((item) => item.id === product.id)) return prev
      return [...prev, { id: product.id, name: product.name, price: product.price }]
    })
  }

  async function removeFromWishlist(productId) {
    if (token) {
      const res = await fetch(`${API_BASE}/api/wishlist/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null)
      const data = await res?.json().catch(() => null)
      if (data?.items) {
        setWishlist(data.items)
        return
      }
    }
    setWishlist((prev) => prev.filter((item) => item.id !== productId))
  }

  async function handleLogin(t) {
    const payload = decodeJwtPayload(t)
    if (!payload) {
      localStorage.removeItem('token')
      return
    }
    localStorage.setItem('token', t)

    // Login: discard guest cart/wishlist and load from server
    const [cartRes, wishlistRes] = await Promise.all([
      fetch(`${API_BASE}/api/cart`, { headers: { Authorization: `Bearer ${t}` } }).catch(
        () => null
      ),
      fetch(`${API_BASE}/api/wishlist`, { headers: { Authorization: `Bearer ${t}` } }).catch(
        () => null
      ),
    ])
    const cartData = await cartRes?.json().catch(() => null)
    const wishlistData = await wishlistRes?.json().catch(() => null)

    setToken(t)
    setUser({ email: payload.email, name: null })

    if (cartData?.items) {
      localStorage.removeItem('guest_cart')
      setCart(cartData.items)
    }
    if (wishlistData?.items) {
      localStorage.removeItem('guest_wishlist')
      setWishlist(wishlistData.items)
    }
    if (payload.role === 'product_manager') {
      navigate('/product-manager')
    } else {
      navigate('/')
    }
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

  function handleLogout() {
    localStorage.removeItem('guest_cart')
    localStorage.removeItem('guest_wishlist')
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setCart([])
    setWishlist([])
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
              userName={user?.name}
              token={token}
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
          path="/verify-email"
          element={<VerifyEmailPage onBack={() => navigate('/login')} />}
        />
        <Route
          path="/cart"
          element={
            <CustomerLayout
              isLoggedIn={!!token}
              userEmail={user?.email}
              userName={user?.name}
              token={token}
              onNavigate={handleNavigate}
              onRequireAuth={requireAuth}
              onLogout={handleLogout}
              cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
              wishlistCount={wishlist.length}
            >
              <CartPage
                onBack={() => navigate(-1)}
                cartItems={cart}
                onRemove={removeFromCart}
                onUpdateQuantity={updateCartQuantity}
                onAddToWishlist={addToWishlist}
                wishlistItems={wishlist}
                isLoggedIn={!!token}
                token={token}
              />
            </CustomerLayout>
          }
        />
        <Route
          path="/checkout"
          element={
            <RequireAuth token={token}>
              <CheckoutPage
                cartItems={cart}
                token={token}
                onOrderConfirmed={(orderData) => {
                  setCart([])
                  navigate('/order-success', { state: orderData })
                }}
              />
            </RequireAuth>
          }
        />
        <Route
          path="/order-success"
          element={
            <RequireAuth token={token}>
              <OrderSuccessPage />
            </RequireAuth>
          }
        />
        <Route
          path="/wishlist"
          element={
            <CustomerLayout
              isLoggedIn={!!token}
              userEmail={user?.email}
              userName={user?.name}
              token={token}
              onNavigate={handleNavigate}
              onRequireAuth={requireAuth}
              onLogout={handleLogout}
              cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
              wishlistCount={wishlist.length}
            >
              <WishlistPage
                onBack={() => navigate(-1)}
                wishlistItems={wishlist}
                onRemove={removeFromWishlist}
              />
            </CustomerLayout>
          }
        />
        <Route
          path="/product/:id"
          element={
            <ProductRoute
              onAddToCart={addToCart}
              onAddToWishlist={addToWishlist}
              onRemoveFromWishlist={removeFromWishlist}
              wishlistItems={wishlist}
              cartItems={cart}
              onUpdateQuantity={updateCartQuantity}
              isLoggedIn={!!token}
              userEmail={user?.email}
              token={token}
              onNavigate={handleNavigate}
              onRequireAuth={requireAuth}
              onLogout={handleLogout}
              cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
              wishlistCount={wishlist.length}
            />
          }
        />
        <Route
          path="/category"
          element={
            <CategoryRoute
              onAddToCart={addToCart}
              onAddToWishlist={addToWishlist}
              onRemoveFromWishlist={removeFromWishlist}
              wishlistItems={wishlist}
              token={token}
            />
          }
        />
        <Route
          path="/search"
          element={
            <CustomerLayout
              isLoggedIn={!!token}
              userEmail={user?.email}
              userName={user?.name}
              token={token}
              onNavigate={handleNavigate}
              onRequireAuth={requireAuth}
              onLogout={handleLogout}
              cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
              wishlistCount={wishlist.length}
            >
              <SearchRoute
                onAddToWishlist={addToWishlist}
                onRemoveFromWishlist={removeFromWishlist}
                wishlistItems={wishlist}
              />
            </CustomerLayout>
          }
        />
        <Route
          path="/account-settings"
          element={
            <CustomerLayout
              isLoggedIn={!!token}
              userEmail={user?.email}
              userName={user?.name}
              token={token}
              onNavigate={handleNavigate}
              onRequireAuth={requireAuth}
              onLogout={handleLogout}
              cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
              wishlistCount={wishlist.length}
            >
              <RequireAuth token={token}>
                <AccountSettingsPage
                  token={token}
                  onProfileUpdate={(partial) =>
                    setUser((prev) => (prev ? { ...prev, ...partial } : prev))
                  }
                />
              </RequireAuth>
            </CustomerLayout>
          }
        />
        <Route
          path="/account/email-change"
          element={<EmailChangeConfirmPage onLogout={handleLogout} />}
        />
        <Route
          path="/orders"
          element={
            <CustomerLayout
              isLoggedIn={!!token}
              userEmail={user?.email}
              userName={user?.name}
              token={token}
              onNavigate={handleNavigate}
              onRequireAuth={requireAuth}
              onLogout={handleLogout}
              cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
              wishlistCount={wishlist.length}
            >
              <RequireAuth token={token}>
                <OrdersPage token={token} />
              </RequireAuth>
            </CustomerLayout>
          }
        />
        <Route
          path="/help"
          element={
            <CustomerLayout
              isLoggedIn={!!token}
              userEmail={user?.email}
              userName={user?.name}
              token={token}
              onNavigate={handleNavigate}
              onRequireAuth={requireAuth}
              onLogout={handleLogout}
              cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
              wishlistCount={wishlist.length}
            >
              <HelpPage />
            </CustomerLayout>
          }
        />

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
              <SalesManagerDashboard
                token={salesManagerToken}
                onLogout={handleSalesManagerLogout}
              />
            </RequireSalesManager>
          }
        />
        <Route
          path="/product-manager"
          element={
            <RequireProductManager token={token}>
              <ProductManagerDashboard
                token={token}
                onLogout={() => {
                  localStorage.removeItem('token')
                  setToken(null)
                  setUser(null)
                  navigate('/login')
                }}
              />
            </RequireProductManager>
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
