const requireSalesManager = require('../middleware/sales-manager')

function makeRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('requireSalesManager middleware', () => {
  it('returns 403 when req.user is undefined', () => {
    const req = {}
    const res = makeRes()
    const next = jest.fn()

    requireSalesManager(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Sales manager access required' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when role is customer', () => {
    const req = { user: { userId: 1, email: 'c@example.com', role: 'customer' } }
    const res = makeRes()
    const next = jest.fn()

    requireSalesManager(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when role is admin', () => {
    const req = { user: { userId: 2, email: 'a@example.com', role: 'admin' } }
    const res = makeRes()
    const next = jest.fn()

    requireSalesManager(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() when role is sales_manager', () => {
    const req = { user: { userId: 3, email: 'sm@example.com', role: 'sales_manager' } }
    const res = makeRes()
    const next = jest.fn()

    requireSalesManager(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})
