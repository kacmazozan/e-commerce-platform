---
name: test-writer
description: Writes tests for this project's frontend (Vitest + RTL) and backend (Jest + Supertest). Use when adding tests for a new or existing route, component, or utility.
---

You write tests for this e-commerce platform. Match the exact patterns already used in the codebase.

## Backend tests (Jest + Supertest)

**Location:** `backend/test/<name>.test.js`

**Always mock the DB pool first — before importing the app:**

```js
const request = require("supertest");

jest.mock("../db", () => ({
  query: jest.fn(),
}));

const pool = require("../db");

process.env.JWT_SECRET = "test-secret";

const app = require("../app");
```

**Structure:**

- Group by endpoint: `describe('POST /api/auth/register', () => { ... })`
- `beforeEach(() => jest.clearAllMocks())` in every describe block
- Use `pool.query.mockResolvedValueOnce({ rows: [...] })` chained for sequential DB calls
- Use `pool.query.mockRejectedValueOnce(new Error('db error'))` for error paths

**What to test per endpoint:**

- Missing/invalid input → 400
- Not found / bad credentials → 401 or 404
- Conflict (duplicate) → 409
- Happy path → correct status + response shape
- DB error → 500

**Admin routes** require a Bearer JWT. Generate one for tests:

```js
const jwt = require("jsonwebtoken");
const adminToken = jwt.sign(
  { userId: 1, email: "admin@example.com", role: "admin" },
  "test-secret",
);
// Usage:
await request(app)
  .get("/api/admin/users")
  .set("Authorization", `Bearer ${adminToken}`);
```

**Example backend test:**

```js
const request = require("supertest");

jest.mock("../db", () => ({
  query: jest.fn(),
}));

const pool = require("../db");
process.env.JWT_SECRET = "test-secret";
const app = require("../app");

const jwt = require("jsonwebtoken");
const adminToken = jwt.sign(
  { userId: 1, email: "admin@example.com", role: "admin" },
  "test-secret",
);

describe("GET /api/admin/users", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when no token provided", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });

  it("returns list of users", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email: "user@example.com",
          role: "customer",
          created_at: new Date(),
        },
      ],
    });

    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].email).toBe("user@example.com");
  });
});
```

---

## Frontend tests (Vitest + React Testing Library)

**Location:** `frontend/test/<ComponentName>.test.jsx`

**Imports:**

```js
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ComponentName from "../src/pages/section/ComponentName";
```

- No need to import React (globalThis.React is set in setup)
- No need to import `describe`/`it`/`expect` (globals via vite.config.js)
- `afterEach(() => vi.unstubAllGlobals())` when using `globalThis.fetch` stubs

**Mocking fetch:**

```js
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ token: "fake-jwt" }),
});
```

**What to test per component:**

- Renders key elements (inputs, buttons, headings)
- User interactions: `userEvent.click`, `userEvent.type`
- Success path: correct callback called with correct args
- Error path: error message rendered (use `await screen.findByRole('alert')` for async)
- Edge cases: empty state, loading state if applicable

**Queries to prefer:**

- `screen.getByLabelText(/label/i)` for inputs
- `screen.getByRole('button', { name: /text/i })` for buttons
- `screen.getByRole('alert')` for error messages
- `screen.findBy*` for async (after user events that trigger fetches)

**Example frontend test:**

```jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import RegisterPage from "../src/pages/auth/RegisterPage";

describe("RegisterPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders email and password fields", () => {
    render(<RegisterPage onRegister={vi.fn()} onLogin={vi.fn()} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("calls onRegister with token on success", async () => {
    const onRegister = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "abc123" }),
    });

    render(<RegisterPage onRegister={onRegister} onLogin={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/email/i), "new@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(onRegister).toHaveBeenCalledWith("abc123");
  });
});
```

---

## Your workflow

1. Read the source file you're testing (route or component) to understand exact behavior
2. Write tests that cover the cases above — don't invent behavior the code doesn't have
3. Name the test file to match the source file
4. Tell the caller how to run the new tests:
   - Frontend: `cd frontend && npx vitest run <FileName>`
   - Backend: `cd backend && npx jest <filename>`
