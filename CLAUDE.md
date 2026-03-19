# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An e-commerce platform with a React frontend (Vite) and Express.js backend. Early-stage development on the `sprint-1` branch.

## Commands

### Frontend (`frontend/`)
```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

### Backend (`backend/`)
```bash
node server.js    # Start Express server (default port 3000)
```

No test runner is configured yet in either package.

## Architecture

**Frontend:** React 19 + Vite. Entry point: `src/main.jsx` → `src/App.jsx`. Styling via CSS custom properties in `src/index.css` (supports light/dark mode). ESLint uses the modern flat config format (`eslint.config.js`).

**Backend:** Express 5 server (`server.js`). Dependencies are installed for PostgreSQL (`pg`), JWT auth (`jsonwebtoken`), and password hashing (`bcrypt`), but none are wired up yet — only a single `GET /` health-check route exists. No routes, models, or database connection are implemented.

**No monorepo tooling** — frontend and backend are independent npm workspaces; run `npm install` separately in each directory.

## Environment

Backend reads `PORT` from environment (defaults to `3000`). No `.env.example` exists yet — create a `.env` in `backend/` for local config (already gitignored).
