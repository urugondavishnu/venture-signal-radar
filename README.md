# Daily Delta

**Live:** [https://venture-signal-radar-r1tq.onrender.com](https://venture-signal-radar-r1tq.onrender.com)

Daily Delta is a startup intelligence platform that lets you track companies with one click and receive automated intelligence reports. It dispatches 10 parallel TinyFish web agents per company — each navigating real websites (blogs, Google News, careers pages, GitHub, Google Trends) — to collect signals across product launches, fundraising, hiring, pricing changes, competitive moves, and more. Available as both a web application and a Chrome extension.

## Demo

https://github.com/user-attachments/assets/afb55243-7356-409a-b528-6a8f6354b43b


## TinyFish API Usage

The backend dispatches one TinyFish SSE agent per intelligence category, all running in parallel. Each agent navigates a real website, reads content, and returns structured JSON findings:

```typescript
const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.TINYFISH_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://news.google.com",
    goal: `You are a news intelligence agent. Search Google News for "${companyName}".
           Find recent articles about funding rounds, product launches, partnerships,
           leadership changes, and major announcements.

           Return results as JSON:
           { "signals": [
             { "signal_type": "financing", "title": "...", "summary": "...",
               "source": "...", "url": "..." }
           ]}`,
  }),
});
```

The response streams SSE events including a `streamingUrl` (live view of the agent browsing), real-time status updates, and a final `COMPLETE` event with the extracted intelligence data as structured JSON.

### Intelligence Agents (10 per company)

| Agent | Target | What It Finds |
|-------|--------|---------------|
| Blog Scanner | Company blog | Product announcements, company updates |
| News Intelligence | Google News | Funding rounds, partnerships, press coverage |
| Hiring Monitor | Careers page | Open roles, team growth signals, expansion areas |
| Pricing Monitor | Pricing page | Plan changes, new tiers, pricing shifts |
| Product Launch Detector | Company website | New features, product releases |
| GitHub Activity | GitHub | Open source activity, tech stack signals |
| Founder Contact | Google Search | Founder LinkedIn profiles, warm intro paths |
| Leading Indicators | Google Trends | Search interest trends, market momentum |
| Competitive Intelligence | Google Search | Competitor comparisons, market positioning |
| Fundraising Detector | Google Search | Fundraising probability signals, investor activity |

## Features

- **One-click tracking** — Store any company from the Chrome extension side panel or the web app
- **Parallel agent execution** — 10 web agents run simultaneously per company with live progress streaming
- **Real-time SSE updates** — Watch agents browse websites in real-time with live status and streaming URLs
- **Structured intelligence reports** — Categorized signals across 12 categories with source links
- **Email reports** — Automated HTML email reports with CSV attachments via Brevo
- **Scheduled pipeline** — Daily cron job runs agents for all tracked companies based on user-configured frequency (daily, every 3 days, weekly, monthly)
- **Run controls** — Stop running agents early (generates partial report), remove queued companies
- **Multi-user auth** — Supabase authentication with per-user company tracking and settings
- **Concurrency queue** — Max 2 companies run simultaneously, others queue automatically

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web App** | React 18, Vite, TypeScript, Tailwind CSS |
| **Chrome Extension** | React 19, Vite, Manifest V3, Chrome Side Panel API |
| **Backend** | Express.js, TypeScript, Node.js |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (JWT) |
| **Web Agents** | TinyFish API (SSE streaming) |
| **Email** | Brevo HTTP API (HTML reports + CSV attachments) |
| **Scheduling** | node-cron (daily intelligence pipeline) |
| **Deployment** | Render (backend + web app served together) |
| **Form Validation** | React Hook Form + Zod |

## How to Run

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [TinyFish](https://agent.tinyfish.ai) API key
- A [Resend](https://resend.com) account (for email reports)

### Database Setup

1. Create a new Supabase project
2. Go to the SQL Editor and run the migration file:

```sql
-- See backend/src/db/migrations.sql
-- Creates tables: users, companies, signals, reports
-- With proper indexes and foreign key constraints
```

### Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
TINYFISH_API_KEY=your_tinyfish_api_key
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_verified_sender@email.com
```

Start the dev server:

```bash
npm run dev
```

The backend runs on `http://localhost:3001`.

### Web App Setup

```bash
cd app
npm install
```

Create `app/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the dev server:

```bash
npm run dev
```

The app runs on `http://localhost:5173` and proxies `/api` requests to the backend.

### Chrome Extension Setup

```bash
cd extension
npm install
```

Create `extension/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE=http://localhost:3001/api
```

Build the extension:

```bash
npm run build
```

Load in Chrome:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension/dist/` folder
4. Click the extension icon to open the side panel

## Deploying to Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Build Command:** `cd app && npm install && npm run build && cd ../backend && npm install && npm run build`
   - **Start Command:** `cd backend && node dist/index.js`
4. Add environment variables:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
   - `TINYFISH_API_KEY`
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (needed at build time for the frontend)

The backend serves the built web app as static files, so both run on a single Render service.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/store-company` | Store a company and run discovery (SSE stream) |
| `GET` | `/api/companies` | List tracked companies for authenticated user |
| `DELETE` | `/api/companies/:id` | Delete a company and all its data |
| `POST` | `/api/run-agents` | Launch 10 parallel intelligence agents (SSE stream) |
| `POST` | `/api/stop-run` | Stop agents early, generate partial report + email |
| `GET` | `/api/agent-status/:company_id` | Get agent run status |
| `GET` | `/api/reports` | Get reports (optional `?company_id=`) |
| `DELETE` | `/api/reports/:id` | Delete a report |
| `POST` | `/api/set-email` | Set email for reports |
| `POST` | `/api/set-email-frequency` | Set report frequency |
| `GET` | `/api/user-settings` | Get user email and frequency settings |
| `POST` | `/api/auth/init` | Initialize user record on first login |

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        User (Browser)                            │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐  │
│  │  Chrome Extension   │    │       Web Application           │  │
│  │  (React + MV3       │    │    (React + Vite + Tailwind)    │  │
│  │   Side Panel)       │    │                                 │  │
│  │                     │    │  - Track companies              │  │
│  │  - Store This Page  │    │  - Run intelligence agents      │  │
│  │  - Run agents       │    │  - View reports                 │  │
│  │  - View reports     │    │  - Configure email settings     │  │
│  └────────┬────────────┘    └──────────────┬──────────────────┘  │
└───────────┼─────────────────────────────────┼────────────────────┘
            │  HTTPS + SSE                    │  HTTPS + SSE
            ▼                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                Express.js Backend (TypeScript)                    │
│                     Deployed on Render                            │
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
│  │  Routes   │  │  Orchestrator │  │  Services  │  │ Scheduler │  │
│  │  (REST +  │  │  (parallel    │  │  (company, │  │ (node-    │  │
│  │   SSE)    │  │   agents)     │  │   signal,  │  │  cron     │  │
│  │          │  │              │  │   report,  │  │  daily)   │  │
│  └────┬─────┘  └──────┬───────┘  │   email)   │  └─────┬─────┘  │
│       │               │          └──────┬─────┘        │         │
└───────┼───────────────┼─────────────────┼──────────────┼─────────┘
        │               │                │              │
        ▼               ▼                ▼              ▼
┌──────────────┐ ┌────────────────┐ ┌──────────┐ ┌──────────────┐
│   Supabase   │ │  TinyFish API  │ │  Brevo   │ │  TinyFish    │
│  (PostgreSQL │ │  (10 parallel  │ │  (HTML   │ │  (scheduled  │
│   + Auth)    │ │   web agents)  │ │  email + │ │   runs)      │
└──────────────┘ │                │ │  CSV)    │ └──────────────┘
                 │  SSE Stream:   │ └──────────┘
                 │  - streamingUrl│
                 │  - STEP updates│
                 │  - COMPLETE    │
                 └───┬──────┬─────┘
                     │      │
        ┌────────────┘      └────────────┐
        ▼                                ▼
  ┌───────────┐  ┌───────────┐     ┌───────────┐
  │  Company  │  │  Google   │ ... │  Google   │  (10 agents)
  │  Blog     │  │  News     │     │  Trends   │
  └───────────┘  └───────────┘     └───────────┘
```

## Project Structure

```
daily-delta/
├── app/                          # Web application (React + Vite)
│   ├── src/
│   │   ├── auth/                 # Login, signup, auth context
│   │   ├── api/client.ts         # API client with SSE helpers
│   │   ├── components/           # UI components (tabs, cards)
│   │   ├── lib/supabase.ts       # Supabase client
│   │   └── App.tsx               # Main app with queue management
│   └── .env                      # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│
├── backend/                      # Express.js API server
│   ├── src/
│   │   ├── agents/               # TinyFish client, goal templates, orchestrator
│   │   ├── routes/               # REST + SSE endpoints
│   │   ├── services/             # Business logic (company, signal, report, email)
│   │   ├── schedulers/           # Daily cron pipeline
│   │   ├── middleware/           # Supabase JWT auth
│   │   ├── db/                   # Supabase client + migrations
│   │   └── utils/                # SSE helpers
│   └── .env                      # SUPABASE_URL, TINYFISH_API_KEY, RESEND_API_KEY
│
├── extension/                    # Chrome extension (React + MV3)
│   ├── src/
│   │   ├── auth/                 # Login, signup, auth context
│   │   ├── api/client.ts         # API client (points to deployed backend)
│   │   ├── tabs/                 # Store, Active Runs, Reports, Settings
│   │   ├── popup/App.tsx         # Main extension app
│   │   └── background/          # Service worker + content script
│   ├── public/manifest.json      # MV3 manifest with side panel
│   └── .env                      # VITE_SUPABASE_URL, VITE_API_BASE
│
└── README.md
```
