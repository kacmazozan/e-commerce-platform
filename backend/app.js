const express = require('express')
const cors = require('cors')

const authRouter = require('./routes/auth')
const cartRouter = require('./routes/cart')
const wishlistRouter = require('./routes/wishlist')
const checkoutRouter = require('./routes/checkout')
const productsRouter = require('./routes/products')
const adminRouter = require('./routes/admin')
const adminProductsRouter = require('./routes/admin-products')
const adminOrdersRouter = require('./routes/admin-orders')
const adminSettingsRouter = require('./routes/admin-settings')
const salesManagerProductsRouter = require('./routes/sales-manager-products')
const salesManagerInvoicesRouter = require('./routes/sales-manager-invoices')
const productManagerRouter = require('./routes/product-manager')
const productManagerInvoicesRouter = require('./routes/product-manager-invoices')
const notificationsRouter = require('./routes/notifications')
const invoicesRouter = require('./routes/invoices')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/cart', cartRouter)
app.use('/api/wishlist', wishlistRouter)
app.use('/api/checkout', checkoutRouter)
app.use('/api/products', productsRouter)
app.use('/api/admin/products', adminProductsRouter)
app.use('/api/admin/orders', adminOrdersRouter)
app.use('/api/admin/settings', adminSettingsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/sales-manager/invoices', salesManagerInvoicesRouter)
app.use('/api/sales-manager/products', salesManagerProductsRouter)
app.use('/api/product-manager/invoices', productManagerInvoicesRouter)
app.use('/api/product-manager', productManagerRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/invoices', invoicesRouter)

// Global error handler — catches unhandled errors from async route handlers
app.use((err, req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

module.exports = app
