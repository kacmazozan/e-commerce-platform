const express = require('express')
const authenticate = require('../middleware/auth')
const pool = require('../db')

const router = express.Router()
router.use(authenticate)

// GET /api/notifications — list notifications for the current user, newest first
router.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT id, product_id, product_name, original_price, discounted_price,
            discount_percent, is_read, created_at, type, message,
            COUNT(*) FILTER (WHERE NOT is_read) OVER () AS unread_count
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [req.user.userId]
  )
  const unreadCount = result.rows.length > 0 ? parseInt(result.rows[0].unread_count) : 0
  res.json({ notifications: result.rows, unreadCount })
})

// PATCH /api/notifications/read-all — mark all user notifications as read
router.patch('/read-all', async (req, res) => {
  await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.userId])
  res.json({ success: true })
})

// DELETE /api/notifications — delete all notifications for the current user
router.delete('/', async (req, res) => {
  await pool.query('DELETE FROM notifications WHERE user_id = $1', [req.user.userId])
  res.json({ success: true })
})

// PATCH /api/notifications/:id/read — mark a single notification as read
router.patch('/:id/read', async (req, res) => {
  const notifId = parseInt(req.params.id, 10)
  if (isNaN(notifId) || notifId <= 0) {
    return res.status(400).json({ error: 'Invalid notification ID' })
  }

  const existing = await pool.query('SELECT id, user_id FROM notifications WHERE id = $1', [
    notifId,
  ])
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Notification not found' })
  }
  if (existing.rows[0].user_id !== req.user.userId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const result = await pool.query(
    'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
    [notifId]
  )
  res.json({ notification: result.rows[0] })
})

module.exports = router
