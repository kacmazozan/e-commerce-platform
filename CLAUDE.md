# CLAUDE.md

This file provides guidance to Claude Code, Codex, and Gemini CLI when working with code in this repository.

## Project Overview

An e-commerce platform (Sabanci University CS308 course project) with a React frontend (Vite) and Express.js backend. Full product requirements are in [`.claude/project_description.md`](.claude/project_description.md) — consult it to ensure all implementations align with the specified role responsibilities and feature scope.

## Git Conventions

- Every commit message must reference the SCRUM item it belongs to (e.g. `SCRUM-66: add middleware`).
- Do **not** add `Co-Authored-By: Claude ...` trailers to commit messages.

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
```

Services: frontend → <http://localhost:5173>, backend → <http://localhost:3000>, PostgreSQL → localhost:5432

Each service has a `Dockerfile` (production) and `Dockerfile.dev` (development). `docker-compose.yml` uses the dev Dockerfiles with volume mounts for hot reload.

## Database

```bash
docker compose exec db psql -U postgres -d ecommerce   # Open psql shell
docker compose exec db psql -U postgres -d ecommerce -c "\dt"   # List tables
docker compose exec db psql -U postgres -d ecommerce -c "\d auth.users"   # Describe a table
```

### Querying the database

```bash
# List all registered users (id, email, role, created_at — password_hash excluded)
docker compose exec db psql -U postgres -d ecommerce -c "SELECT id, email, role, created_at FROM auth.users;"

# Count users
docker compose exec db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM auth.users;"

# Find a specific user by email
docker compose exec db psql -U postgres -d ecommerce -c "SELECT id, email, role, created_at FROM auth.users WHERE email = 'user@example.com';"

# Delete a user by email (useful for re-testing registration)
docker compose exec db psql -U postgres -d ecommerce -c "DELETE FROM auth.users WHERE email = 'user@example.com';"
```

### Running migrations

Migrations are managed with `node-pg-migrate`. Migration scripts live in `backend/migrations/`.

```bash
docker compose exec backend npm run migrate:up    # Apply all pending migrations
docker compose exec backend npm run migrate:down  # Roll back the last migration
```

To add a new migration, create `backend/migrations/<N>_description.js` (increment N) with `exports.up` and `exports.down` functions, then run `migrate:up`.

The runner tracks applied migrations in a `pgmigrations` table in the database. Never edit a migration file that has already been applied — write a new one instead.

### Seeding an admin user

```bash
docker compose exec -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD=yourpassword backend node scripts/seed-admin.js
```

Both env vars are required — the script exits if either is missing.

### Seeding a sales manager user

```bash
docker compose exec -e SALES_MANAGER_EMAIL=sm@example.com -e SALES_MANAGER_PASSWORD=yourpassword -e "SALES_MANAGER_NAME=Jane Doe" backend node scripts/seed-sales-manager.js
```

Must be run via `docker compose exec` so the container's `DATABASE_URL` is available. All three env vars are required. The script inserts into both `auth.users` (role=`sales_manager`) and `auth.sales_managers` (name). Sales managers log in at `/sales-manager/login`.

### Seeding products

```bash
docker compose exec backend node scripts/seed-products.js
```

Inserts 56 products across all 8 categories. The script is safe to run multiple times — it exits early if the table already has rows.

To wipe and re-seed:

```bash
docker compose exec db psql -U postgres -d ecommerce -c "TRUNCATE products RESTART IDENTITY CASCADE;"
docker compose exec backend node scripts/seed-products.js
```

`RESTART IDENTITY` resets the `id` sequence back to 1. `CASCADE` also truncates `cart_items` (which foreign-keys into `products`). `order_items` is now protected by `ON DELETE RESTRICT` — if any orders exist, you must delete them first before truncating products.

## Architecture

### Backend

`server.js` is the entry point: it loads `.env`, validates `JWT_SECRET`, then calls `app.listen()`. All Express setup lives in `app.js` (middleware, route mounting, global error handler) and is exported without starting a server — this separation makes the app importable in tests without binding a port.

`db.js` exports a single `pg.Pool` instance connected via `DATABASE_URL`.

Route files live in `backend/routes/`:

- `auth.js` — `POST /api/auth/register`, `POST /api/auth/login`, and password reset endpoints
- `products.js` — public `GET /api/products` (no auth); supports `?category=` and `?limit=` query params; results ordered by `created_at DESC`
- `admin.js` — user CRUD at `/api/admin/users` and `GET /api/admin/me`
- `admin-products.js` — product CRUD at `/api/admin/products`
- `admin-orders.js` — order management at `/api/admin/orders`
- `admin-settings.js` — system settings + dashboard stats at `/api/admin/settings`

Middleware in `backend/middleware/`:

- `auth.js` — verifies Bearer JWT and sets `req.user` (`{ userId, email, role }`)
- `admin.js` — requires `req.user.role === 'admin'`; all admin routes stack both middlewares
- `sales-manager.js` — requires `req.user.role === 'sales_manager'`; stack with `authenticate` the same way as admin routes

All admin routes use `router.use(authenticate); router.use(requireAdmin)` at the top of their file. Sales manager routes follow the same pattern with `requireSalesManager`.

JWT payload shape: `{ userId, email, role }`. Tokens expire in 7 days.

### Frontend

`src/main.jsx` wraps `<App>` in `<BrowserRouter>`. All routing is in `src/App.jsx` using React Router v7.

Auth state (`token`, `user`), admin auth state (`adminToken`), and sales manager auth state (`salesManagerToken`) are held in `App` state, initialised from `localStorage`. The JWT payload is decoded client-side with a local `decodeJwtPayload` helper (no library) to extract email and role.

**Auth sessions and route guards:**

- Regular users: `localStorage.token` → `RequireAuth` guard → login at `/login`
- Sales managers: `localStorage.salesManagerToken` → `RequireSalesManager` guard (checks `payload.role === 'sales_manager'`) → login at `/sales-manager/login`
- Admin: `localStorage.adminToken` → `RequireAdmin` guard (checks `payload.role === 'admin'`) → login at `/admin/login`

Each role has a fully isolated session. Sales manager pages live in `src/pages/sales-manager/`.

`src/api.js` exports `API_BASE` read from `import.meta.env.VITE_API_BASE_URL`, falling back to `http://localhost:3000`. Every page that calls the backend imports this; set `VITE_API_BASE_URL` in `frontend/.env` when deploying.

Pages are colocated with their CSS under `src/pages/<section>/`. Admin pages live in `src/pages/admin/` and are self-contained (own CSS, inline SVG icons).

**Product data is fetched from the API, not hardcoded:**
- `CategoryPage` — fetches `GET /api/products?category={category.title}` on mount; shows a loading state while the request is in flight
- `HomePage` new releases — fetches `GET /api/products?limit=8` on mount; the 8 most recently added products are shown as new releases (insertion order drives this — no explicit "featured" flag exists)

### Database schema

All user/auth tables live in the `auth` schema (`auth.users`, `auth.customers`, `auth.sales_managers`, `auth.product_managers`). Product and order tables are in `public` (`products`, `orders`, `order_items`, `system_settings`).

User roles are a PostgreSQL enum `auth.user_role`: `customer`, `sales_manager`, `product_manager`, `admin`.

### Testing

**Frontend** — Vitest + React Testing Library. Test files live in `frontend/test/`. Setup in `frontend/test/setup.js` imports `@testing-library/jest-dom` and sets `globalThis.React`. Globals (`describe`, `it`, `expect`, `vi`) are enabled via `vite.config.js`.

**Backend** — Jest + Supertest. Test files live in `backend/test/`. The DB pool is always mocked (`jest.mock('../db', ...)`) so tests run without a real database.

### CI/CD

`.github/workflows/ci-cd.yml` runs three independent jobs on every push/PR:

1. **Lint & Format** — ESLint + Prettier for both packages
2. **Test** — Vitest (frontend) + Jest (backend); no database service needed since backend tests mock the DB
3. **Build** — `npm run build` in `frontend/`

### Root setup

`package.json` at the repo root installs Husky and lint-staged only. Run `npm install` at the root to set up git hooks, then separately in `frontend/` and `backend/`.

The pre-commit hook runs lint-staged, which lints and checks formatting on staged `.js`/`.jsx` files only (scoped per package so each uses its own ESLint config and node_modules).

## Environment

Create a `.env` in `backend/` for local config (already gitignored). Required variables:

```
PORT=3000
DATABASE_URL=postgres://postgres:password@localhost:5432/ecommerce
JWT_SECRET=your_secret_here
```

`PORT` defaults to `3000` if not set. For frontend API URL override, create `frontend/.env`:

```
VITE_API_BASE_URL=https://your-backend-host.com
```
