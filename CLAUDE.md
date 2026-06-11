# CLAUDE.md

This file provides guidance to Claude Code, Codex, and Gemini CLI when working with code in this repository.

## Project Overview

An e-commerce platform (Sabanci University CS308 course project) with a React frontend (Vite) and Express.js backend. Full product requirements are in [`.claude/project_description.md`](.claude/project_description.md) — consult it to ensure all implementations align with the specified role responsibilities and feature scope.

## Git Conventions

When writing commit messages, follow [Conventional Commits](.claude/conventional-commits.md). Do **not** add `Co-Authored-By: Claude ...` trailers.

When opening GitHub bug issues, follow [Bug Issue Template](.claude/issue-bug-template.md).

## Commands

### Frontend (`frontend/`)

```bash
npm run dev           # Start Vite dev server with HMR
npm run build         # Production build
npm run lint          # ESLint
npm run preview       # Preview production build
npm run format        # Prettier auto-fix
npm run format:check  # Prettier validation (used in CI)
npm test              # Vitest (single run)
npm run test:watch    # Vitest (watch mode)
```

### Backend (`backend/`)

```bash
node server.js        # Start Express server (default port 3000)
npm run lint          # ESLint
npm run format        # Prettier auto-fix
npm run format:check  # Prettier validation (used in CI)
npm test              # Jest (single run)
```

### Before committing

Run these in both packages before every commit — CI enforces all four:

```bash
# Frontend
cd frontend && npm run lint && npm run format:check

# Backend
cd backend && npm run lint && npm run format:check

# Auto-fix formatting (then re-check)
npm run format
```

### Running a single test

```bash
# Frontend — pass a filename pattern
cd frontend && npx vitest run LoginPage

# Backend — pass a test name pattern
cd backend && npx jest --testNamePattern "returns 201"
```

### Docker

```bash
docker compose up --build   # First run, or after package.json changes
docker compose up           # Subsequent runs
docker compose down         # Stop and remove containers
docker compose down -v      # Stop and remove containers AND all volumes (see warning below)
```

> **Warning — `down -v`:** Removes **all** volumes, including the named `postgres_data` volume. All database data (users, products, orders) will be lost. Only use this to fix stale anonymous `node_modules` volumes when `nodemon` or other packages are not found inside the container despite being in `package.json`. After running, bring the stack back up — seeds run automatically.

On every `docker compose up`, the backend entrypoint (`backend/entrypoint.sh`) automatically:

1. Waits for PostgreSQL to accept connections
2. Runs all pending migrations (`npm run migrate:up`)
3. Seeds all dev accounts and products (all seeds are idempotent — safe to re-run)

**Dev credentials (defined in `docker-compose.yml`):**

| Role            | Email                        | Password               |
| --------------- | ---------------------------- | ---------------------- |
| Admin           | `admin@example.com`          | `admin123456`          |
| Sales Manager   | `salesmanager@example.com`   | `salesmanager123456`   |
| Product Manager | `productmanager@example.com` | `productmanager123456` |

Products (56 items across 8 categories) are also seeded automatically.

Services: frontend → <http://localhost:5173>, backend → <http://localhost:3000>, PostgreSQL → localhost:5432, MailHog UI → <http://localhost:8025>

Each service has a `Dockerfile` (production) and `Dockerfile.dev` (development). `docker-compose.yml` uses the dev Dockerfiles with volume mounts for hot reload.

## Database

```bash
docker compose exec db psql -U postgres -d ecommerce        # Open psql shell
docker compose exec db psql -U postgres -d ecommerce -c "\dt"              # List tables
docker compose exec db psql -U postgres -d ecommerce -c "\d auth.users"    # Describe a table
```

### Running migrations

Migrations are managed with `node-pg-migrate`. Migration scripts live in `backend/migrations/`.

```bash
docker compose exec backend npm run migrate:up    # Apply all pending migrations
docker compose exec backend npm run migrate:down  # Roll back the last migration
```

To add a new migration, create `backend/migrations/<N>_description.js` (increment N) with `exports.up` and `exports.down` functions, then run `migrate:up`.

Never edit a migration file that has already been applied — write a new one instead.

**node-pg-migrate conventions:**
- Use `pgm.addColumns()` (plural, 2-arg form) when adding columns to `auth`-schema tables — matches migrations 22, 23, 27.
- Pass **unquoted** string values to `default` (e.g. `default: 'price_drop'`). node-pg-migrate wraps strings in SQL quotes automatically; passing a pre-quoted value like `"'price_drop'"` produces the literal `'''price_drop'''` in the DB.
- After adding columns via migration, update every SELECT query that should return them or the frontend will receive `undefined`.

### Manually re-seeding individual accounts

Seeds run automatically on startup, but individual scripts can be invoked directly if needed:

```bash
docker compose exec backend node scripts/seed-admin.js
docker compose exec backend node scripts/seed-sales-manager.js
docker compose exec backend node scripts/seed-product-manager.js
docker compose exec backend node scripts/seed-products.js
```

To wipe and re-seed products:

```bash
docker compose exec db psql -U postgres -d ecommerce -c "TRUNCATE products RESTART IDENTITY CASCADE;"
docker compose exec backend node scripts/seed-products.js
```

## Architecture

### Backend

`server.js` is the entry point; all Express setup lives in `app.js`. `db.js` exports a single `pg.Pool` instance.

Route files in `backend/routes/`:

- `auth.js` — `POST /api/auth/register`, `POST /api/auth/login`, password reset endpoints
- `products.js` — public; `GET /api/products` (`?category=`, `?limit=`, `?sort=`), `GET /api/products/search` (`?q=`, `?limit=`, `?sort=`); valid sort values: `newest` (default), `price_asc`, `price_desc`, `popularity`; authenticated: `GET /api/products/reviews/mine`, `GET /api/products/:id/reviews`, `POST /api/products/:id/reviews`, `PATCH /api/products/:id/reviews`
- `cart.js` — authenticated; `GET/POST /api/cart`, `PUT /api/cart/:productId`, `DELETE /api/cart/:productId`, `DELETE /api/cart`
- `checkout.js` — authenticated; `POST /api/checkout/reserve`, `DELETE /api/checkout/reserve`, `POST /api/checkout/confirm`
- `admin.js` — `GET/POST/PUT/DELETE /api/admin/users`, `GET /api/admin/me`
- `admin-products.js` — product CRUD at `/api/admin/products`
- `admin-orders.js` — order management at `/api/admin/orders`
- `admin-settings.js` — system settings + dashboard stats at `/api/admin/settings`
- `sales-manager-products.js` — `GET /api/sales-manager/products` (`?category=`, `?q=`), `GET /api/sales-manager/products/categories`, `PATCH /api/sales-manager/products/:id/price`, `POST /api/sales-manager/products/discount`, `DELETE /api/sales-manager/products/:id/discount`
- `product-manager.js` — `GET /api/product-manager/me`, product CRUD at `/api/product-manager/products`, per-size stock at `GET/PUT /api/product-manager/products/:id/size-stock` (PUT body `{ stocks: { S: 10, M: 5 } }`; validates sizes against `products.sizes`, syncs `products.stock` to the per-size sum), categories at `/api/product-manager/categories`, orders at `/api/product-manager/orders`, comments at `/api/product-manager/comments`
- `product-manager-invoices.js` — invoices at `/api/product-manager/invoices` (separate file from `product-manager.js`)
- `sales-manager-invoices.js` — `GET /api/sales-manager/invoices` (`?startDate=`, `?endDate=`), `GET /api/sales-manager/invoices/:orderId`, `GET /api/sales-manager/invoices/:orderId/pdf`, `GET /api/sales-manager/invoices/export/pdf`
- `sales-manager-refunds.js` — `GET /api/sales-manager/refunds` (`?status=`, `?page=`, `?limit=`), `PATCH /api/sales-manager/refunds/:id/approve`, `PATCH /api/sales-manager/refunds/:id/reject`; approve is transactional (stock restore + credit_balance update); both endpoints fire-and-forget a customer notification after commit
- `sales-manager-stats.js` — `GET /api/sales-manager/stats`; returns published_products, unpriced_products, active_discounts, pending_refunds, revenue_this_month, orders_this_month
- `sales-manager-revenue.js` — `GET /api/sales-manager/revenue` (`?startDate=YYYY-MM-DD`, `?endDate=YYYY-MM-DD`; defaults to current month); returns `summary` (total_revenue, total_cost, net_profit_loss, missing_cost_products) and `daily` array; excludes cancelled orders
- `notifications.js` — authenticated; `GET /api/notifications` (returns `type` and `message`), `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`, `DELETE /api/notifications`
- `wishlist.js` — authenticated; `GET/POST /api/wishlist`, `DELETE /api/wishlist/:productId`
- `payment-methods.js` — customer-only; `GET/POST /api/payment-methods`, `PATCH /api/payment-methods/:id/default`, `DELETE /api/payment-methods/:id`; card data stored AES-256-GCM encrypted, responses expose only brand/last4/expiry/cardholder; expired cards are rejected on save and at checkout
- `invoices.js` — `GET /api/invoices/health`, `POST /api/invoices/generate`; checkout confirmation also queues invoice email delivery automatically

Middleware in `backend/middleware/`:

- `auth.js` — verifies Bearer JWT and sets `req.user`
- `admin.js` — requires `role === 'admin'`; stack with `auth.js` on all admin routes
- `sales-manager.js` — requires `role === 'sales_manager'`; stack with `auth.js` on all SM routes
- `product-manager.js` — requires `role === 'product_manager'`; stack with `auth.js` on all PM routes

### Sensitive data at rest

`backend/services/secure-fields.js` provides `encryptField`/`decryptField` (AES-256-GCM, `enc:v1:` envelope prefix) and `fingerprintField` (HMAC-SHA256, used for card de-duplication). Key comes from `DATA_ENCRYPTION_KEY` (32-byte base64 or 64-char hex; passphrases are scrypt-derived); falls back to `JWT_SECRET` outside production. Encrypted at rest: `orders.address`, `auth.customers.tax_id`, `auth.customers.home_address`, and all card fields in `customer_payment_methods` (migration 32 backfills existing rows). `decryptField` passes through non-encrypted values, so plaintext legacy rows still read correctly. CVV is never stored.

### Invoice service

Invoice generation and email delivery now live inside the Node backend. `backend/services/invoice.js` handles request validation, totals, and PDF creation with `pdfkit`; `backend/services/mailer.js` sends mail over SMTP (MailHog in local Docker); `backend/services/invoice-workflow.js` ties generation and delivery together. The public API is exposed from `backend/routes/invoices.js`.

### Frontend

`src/main.jsx` wraps `<App>` in `<BrowserRouter>`. All routing in `src/App.jsx` (React Router v7).

Auth state (`token`, `adminToken`, `salesManagerToken`, `pmToken`) held in `App`, each initialised from its own `localStorage` key. JWT decoded client-side via `src/utils/jwt.js`.

Shared: `src/styles/dashboardStyles.js` (Tailwind constants for buttons/inputs), `src/components/DashboardLayout.jsx` (sidebar+header shell used by SM, PM, and admin dashboards), `src/constants/sortOptions.js` (sort dropdown options for product listing pages).

**Route guards:**

- Customers: `localStorage.token` → `RequireAuth` → `/login`
- Sales managers: `localStorage.salesManagerToken` → `RequireSalesManager` → `/sales-manager/login`
- Product managers: `localStorage.pmToken` → `RequireProductManager` → `/product-manager/login`
- Admin: `localStorage.adminToken` → `RequireAdmin` → `/admin/login`

`src/api.js` exports `API_BASE` from `VITE_API_BASE_URL`, falling back to `http://localhost:3000`.

Pages live in `src/pages/<section>/`. Key pages:

- `DiscountManagement` (`src/pages/sales-manager/DiscountManagement.jsx`) — paginated product table with category filter, search bar, and bulk discount apply/remove
- `PriceManagement` (`src/pages/sales-manager/PriceManagement.jsx`) — per-product price editor; shows amber banner listing unpriced products by name
- `RevenueChart` (`src/pages/sales-manager/RevenueChart.jsx`) — gradient area chart (Revenue + Cost) with date range filter, custom profit tooltip, and summary cards; wired as "Revenue" tab in `SalesManagerDashboard`
- SM dashboard tabs: overview, products, discounts, invoices, refunds, revenue; PM dashboard tabs: overview, products, categories, inventory, orders, deliveries, invoices, comments; both persist active tab via `?tab=` URL param (`useSearchParams`)
- `PMLoginPage` (`src/pages/product-manager/PMLoginPage.jsx`) — standalone PM login at `/product-manager/login`, issues `pmToken`
- `NotificationBell` (`src/pages/home/components/NotificationBell.jsx`) — notifications for logged-in customers; checks `n.type === 'refund_decision'` to render `n.message` vs. price-drop format; mark-read, mark-all-read, clear-all
- `RefundsManagement` (`src/pages/sales-manager/RefundsManagement.jsx`) — SM refund list with status filter; approve/reject actions
- `SMOverview` (`src/pages/sales-manager/SMOverview.jsx`) — SM dashboard overview; fetches `/api/sales-manager/stats`
- `MyReviewsPage` (`src/pages/reviews/MyReviewsPage.jsx`) — customer's review list at `/my-reviews`; edit reviews in place; accessible from Navbar user dropdown

### Database schema

Auth schema: `auth.users`, `auth.customers`, `auth.sales_managers`, `auth.product_managers`.
Public schema: `products`, `orders`, `order_items`, `system_settings`, `cart_items`, `stock_reservations`, `wishlist_items`, `product_discounts`, `notifications`, `product_reviews`, `product_size_stock`, `customer_payment_methods`.
Role enum: `auth.user_role` — `customer`, `sales_manager`, `product_manager`, `admin`.

`orders.total` stores the product subtotal only (excluding shipping). `orders.shipping_cost` is a separate column (added in migration 26); calculated server-side from `system_settings.free_shipping_threshold`.

`auth.customers` has `credit_balance numeric(10,2) NOT NULL DEFAULT 0` (migration 27); this is the store-credit balance refunded when a SM approves a return.

`notifications` has `type varchar(30) NOT NULL DEFAULT 'price_drop'` and `message text` (migration 28); `product_id`, `original_price`, `discounted_price`, `discount_percent` are nullable to support non-price-drop notification types (e.g. `refund_decision`). There is also a `refunds` table (migration 19) used by customer-facing refund requests.

`products.cost_price` is nullable `numeric(10,2)` (migration 27); used for profit calculations in the revenue report. Admin and PM product CRUD accept and validate this field. `seed-products.js` seeds it at 60 % of retail; `seed-revenue-demo.js` creates a demo customer (`democustomer@example.com`) and ~80 backdated orders over 180 days for chart development.

`product_size_stock` (migration 30) tracks per-size stock for products with `sizes` defined: `(product_id, size)` unique, `stock >= 0` check. **Invariant:** `products.stock` always stores the aggregate total — for sized products it must equal `SUM(product_size_stock.stock)`. Checkout confirm, order cancel, and refund approve update both tables for sized items; the PM size-stock PUT resyncs the aggregate. Public routes (`products.js`) read availability from `products.stock` only.

`products.price` is nullable. `NULL` price means the product is unpublished — hidden from all public routes (`/api/products`, search, cart add, wishlist add). Only the sales manager can set a price via `PATCH /api/sales-manager/products/:id/price`, which publishes the product.

`customer_payment_methods` (migration 31) stores saved cards: `brand`/`last4` plaintext for display, cardholder/PAN/expiry AES-encrypted (`*_enc` columns), `fingerprint_hash` unique per `(user_id, fingerprint_hash)` for de-duplication. `orders.payment_method_id` references it (`SET NULL` on delete).

### Testing

**Frontend** — Vitest + React Testing Library. Tests in `frontend/test/`. Setup in `frontend/test/setup.js`.

**Backend** — Jest + Supertest. Tests in `backend/test/`. DB pool always mocked.

**Invoices** — Jest + Supertest. Tests in `backend/test/invoices.test.js` and `backend/test/invoice-models.test.js`.

## Environment

`backend/.env` (gitignored):

```
PORT=3000
DATABASE_URL=postgres://postgres:password@localhost:5432/ecommerce
JWT_SECRET=your_secret_here
# 32 random bytes, base64 — encrypts sensitive fields at rest (falls back to JWT_SECRET in dev)
DATA_ENCRYPTION_KEY=replace-with-32-byte-base64-key
```

`frontend/.env` (optional, for deployment):

```
VITE_API_BASE_URL=https://your-backend-host.com
```
