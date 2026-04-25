#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."
until node -e "require('./db').query('SELECT 1').then(() => process.exit(0)).catch(() => process.exit(1))" 2>/dev/null; do
  echo "  Postgres not ready, retrying in 2s..."
  sleep 2
done
echo "PostgreSQL is ready."

echo "Running migrations..."
npm run migrate:up

echo "Seeding admin user..."
node scripts/seed-admin.js

echo "Seeding sales manager..."
node scripts/seed-sales-manager.js

echo "Seeding product manager..."
node scripts/seed-product-manager.js

echo "Seeding categories..."
node scripts/seed-categories.js

echo "Seeding products..."
node scripts/seed-products.js

echo "Starting server..."
exec npm run dev
