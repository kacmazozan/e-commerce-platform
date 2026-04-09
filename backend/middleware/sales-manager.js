function requireSalesManager(req, res, next) {
  if (!req.user || req.user.role !== 'sales_manager') {
    return res.status(403).json({ error: 'Sales manager access required' })
  }
  next()
}

module.exports = requireSalesManager
