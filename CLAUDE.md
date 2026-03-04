# Venture Signal Tracker

Startup intelligence platform: Chrome extension + Express backend. Track startups with one click, receive daily intelligence reports.

## Architecture

```
Extension (React + Vite + MV3) → Backend API (Express + TS) → Supabase DB
                                  Backend → TinyFish Web Agents → Data Collection
                                  Backend → Resend → Email Reports
                                  Backend → node-cron → Daily Pipeline
```

## Key Directories

- `backend/src/agents/` — TinyFish agent client, goal templates, orchestrator
- `backend/src/routes/` — Express REST + SSE endpoints
- `backend/src/services/` — Business logic (company, signal, report, email, user)
- `backend/src/schedulers/` — Daily cron pipeline
- `extension/src/tabs/` — Main UI tabs (Store, Active Runs, Reports)
- `extension/src/components/` — Reusable React components
- `extension/src/api/client.ts` — Backend API client with SSE stream reader

## API Endpoints

- `POST /api/store-company` — Bookmark company (SSE stream with discovery)
- `GET /api/companies` — List tracked companies
- `POST /api/run-agents` — Launch parallel intelligence agents (SSE stream)
- `GET /api/agent-status/:company_id` — Agent run status
- `GET /api/reports` — Get reports (optional `?company_id=`)
- `POST /api/set-email` — Set email for daily reports
- `GET /api/user-email` — Get configured email

## Running

```bash
# Backend
cd backend && npm install && npm run dev

# Extension (build, then load dist/ in Chrome)
cd extension && npm install && npm run build
```

## Environment Variables

See `backend/.env.example` for required keys:
- SUPABASE_URL, SUPABASE_SERVICE_KEY
- TINYFISH_API_KEY
- RESEND_API_KEY, RESEND_FROM_EMAIL

## Database

Run `backend/src/db/migrations.sql` in Supabase SQL Editor.
Tables: users, companies, signals, reports.
