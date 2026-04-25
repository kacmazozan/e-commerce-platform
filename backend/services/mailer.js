const nodemailer = require('nodemailer')

function createTransport() {
  const host = process.env.SMTP_HOST || 'localhost'
  const port = Number(process.env.SMTP_PORT || 1025)
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  const timeout = Number(process.env.SMTP_TIMEOUT || 10000)

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: user ? { user, pass } : undefined,
    connectionTimeout: timeout,
  })
}

async function sendMail({ to, subject, html, attachments = [] }) {
  const sender = process.env.SENDER_EMAIL || 'invoices@fier.com'
  const recipients = Array.isArray(to) ? to : [to]
  const transport = createTransport()

  return transport.sendMail({
    from: sender,
    to: recipients.join(', '),
    subject,
    html,
    attachments,
  })
}

module.exports = {
  createTransport,
  sendMail,
}
