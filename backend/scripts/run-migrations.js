#!/usr/bin/env node

const path = require('path')
const { runner } = require('node-pg-migrate')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const direction = process.argv[2] || 'up'

if (!['up', 'down'].includes(direction)) {
  console.error('Usage: node scripts/run-migrations.js <up|down>')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required to run migrations')
  process.exit(1)
}

const shortPrefixWarning = /^Can't determine timestamp for \d+$/
const logger = {
  debug: (message) => console.debug(message),
  info: (message) => console.log(message),
  warn: (message) => console.warn(message),
  error: (message) => {
    if (!shortPrefixWarning.test(String(message))) {
      console.error(message)
    }
  },
}

runner({
  databaseUrl: process.env.DATABASE_URL,
  dir: path.join(__dirname, '../migrations'),
  direction,
  migrationsTable: 'pgmigrations',
  schema: 'public',
  checkOrder: true,
  singleTransaction: true,
  logger,
})
  .then(() => {
    console.log('Migrations complete!')
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
