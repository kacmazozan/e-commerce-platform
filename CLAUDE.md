# CLAUDE.md

This file provides guidance to Claude Code, Codex, and Gemini CLI when working with code in this repository.

## Project Overview

An e-commerce platform (Sabanci University CS308 course project) with a React frontend (Vite) and Express.js backend. Full product requirements are in [`.claude/project_description.md`](.claude/project_description.md) — consult it to ensure all implementations align with the specified role responsibilities and feature scope.

## Git Conventions

When writing commit messages, follow [Conventional Commits](.claude/conventional-commits.md). Do **not** add `Co-Authored-By: Claude ...` trailers.

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

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `admin123456` |
| Sales Manager | `salesmanager@example.com` | `salesmanager123456` |
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
- `products.js` — public; `GET /api/products` (`?category=`, `?limit=`), `GET /api/products/search` (`?q=`)
- `cart.js` — authenticated; `GET/POST /api/cart`, `PUT /api/cart/:productId`, `DELETE /api/cart/:productId`, `DELETE /api/cart`
- `checkout.js` — authenticated; `POST /api/checkout/reserve`, `DELETE /api/checkout/reserve`, `POST /api/checkout/confirm`
- `admin.js` — `GET/POST/PUT/DELETE /api/admin/users`, `GET /api/admin/me`
- `admin-products.js` — product CRUD at `/api/admin/products`
- `admin-orders.js` — order management at `/api/admin/orders`
- `admin-settings.js` — system settings + dashboard stats at `/api/admin/settings`
- `sales-manager-products.js` — `GET /api/sales-manager/products` (`?category=`, `?q=`), `GET /api/sales-manager/products/categories`, `PATCH /api/sales-manager/products/:id/price`, `POST /api/sales-manager/products/discount`, `DELETE /api/sales-manager/products/:id/discount`
- `notifications.js` — authenticated; `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`, `DELETE /api/notifications`
- `wishlist.js` — authenticated; `GET/POST /api/wishlist`, `DELETE /api/wishlist/:productId`
- `invoices.js` — `GET /api/invoices/health`, `POST /api/invoices/generate`; checkout confirmation also queues invoice email delivery automatically

Middleware in `backend/middleware/`:

- `auth.js` — verifies Bearer JWT and sets `req.user`
- `admin.js` — requires `role === 'admin'`; stack with `auth.js` on all admin routes
- `sales-manager.js` — requires `role === 'sales_manager'`; stack with `auth.js` on all SM routes

### Invoice service

Invoice generation and email delivery now live inside the Node backend. `backend/services/invoice.js` handles request validation, totals, and PDF creation with `pdfkit`; `backend/services/mailer.js` sends mail over SMTP (MailHog in local Docker); `backend/services/invoice-workflow.js` ties generation and delivery together. The public API is exposed from `backend/routes/invoices.js`.

### Frontend

`src/main.jsx` wraps `<App>` in `<BrowserRouter>`. All routing in `src/App.jsx` (React Router v7).

Auth state (`token`, `adminToken`, `salesManagerToken`) held in `App`, initialised from `localStorage`. JWT decoded client-side via `src/utils/jwt.js`.

Shared: `src/styles/dashboardStyles.js` (Tailwind constants), `src/components/DashboardLayout.jsx` (sidebar+header shell for admin and SM dashboards).

**Route guards:**

- Customers: `localStorage.token` → `RequireAuth` → `/login`
- Sales managers: `localStorage.salesManagerToken` → `RequireSalesManager` → `/sales-manager/login`
- Admin: `localStorage.adminToken` → `RequireAdmin` → `/admin/login`

`src/api.js` exports `API_BASE` from `VITE_API_BASE_URL`, falling back to `http://localhost:3000`.

Pages live in `src/pages/<section>/`. Key SM pages:
- `DiscountManagement` (`src/pages/sales-manager/DiscountManagement.jsx`) — paginated product table with category filter, search bar, and bulk discount apply/remove
- `NotificationBell` (`src/pages/home/components/NotificationBell.jsx`) — price-drop notifications for logged-in customers; mark-read, mark-all-read, clear-all

### Database schema

Auth schema: `auth.users`, `auth.customers`, `auth.sales_managers`, `auth.product_managers`.
Public schema: `products`, `orders`, `order_items`, `system_settings`, `cart_items`, `stock_reservations`, `wishlist_items`, `product_discounts`, `notifications`.
Role enum: `auth.user_role` — `customer`, `sales_manager`, `product_manager`, `admin`.

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
```

`frontend/.env` (optional, for deployment):

```
VITE_API_BASE_URL=https://your-backend-host.com
```
