const nodemailer = require('nodemailer')

function createTransport() {
  const host = process.env.SMTP_HOST || 'mailserver'
  const port = Number(process.env.SMTP_PORT || 1025)
  const secure =
    process.env.SMTP_SECURE === undefined ? port === 465 : process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  const timeout = Number(process.env.SMTP_TIMEOUT || 10000)

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: timeout,
  })
}

async function sendMail({ to, subject, html, text, attachments = [] }) {
  const sender = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'invoices@fier.com'
  const recipients = Array.isArray(to) ? to : [to]
  const transport = createTransport()

  return transport.sendMail({
    from: sender,
    to: recipients.join(', '),
    subject,
    text,
    html,
    attachments,
  })
}

module.exports = {
  createTransport,
  sendMail,
}
