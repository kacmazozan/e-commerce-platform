const express = require('express')
const cors = require('cors')

const authRouter = require('./routes/auth')
const cartRouter = require('./routes/cart')
const checkoutRouter = require('./routes/checkout')
const productsRouter = require('./routes/products')
const adminRouter = require('./routes/admin')
const adminProductsRouter = require('./routes/admin-products')
const adminOrdersRouter = require('./routes/admin-orders')
const adminSettingsRouter = require('./routes/admin-settings')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/cart', cartRouter)
app.use('/api/checkout', checkoutRouter)
app.use('/api/products', productsRouter)
app.use('/api/admin/products', adminProductsRouter)
app.use('/api/admin/orders', adminOrdersRouter)
app.use('/api/admin/settings', adminSettingsRouter)
app.use('/api/admin', adminRouter)

// Global error handler — catches unhandled errors from async route handlers
app.use((err, req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

module.exports = app
