# DoorDash Earnings Tracker

A full-stack web application I built to track, analyze, and optimize my DoorDash delivery earnings. Designed and developed from scratch to replace a manual Excel workflow — featuring real-time data integrations, AI-powered insights via Claude, and a secure PostgreSQL-backed cross-device sync system.

🔗 **Live App:** [door-dash-tracker-3xmi.vercel.app](https://door-dash-tracker-3xmi.vercel.app)  
🔗 **API:** [doordash-api-production.up.railway.app](https://doordash-api-production.up.railway.app)  
🔗 **GitHub:** [github.com/dennisgomezartica-jpg/Door-Dash-Tracker](https://github.com/dennisgomezartica-jpg/Door-Dash-Tracker)

---

## Why I Built This

I was tracking my DoorDash earnings in a spreadsheet and kept asking questions it couldn't answer — which nights actually pay best? Does rain help? Am I working too many miles for too little pay? I built this app to answer those questions, make tax season stress-free, and give myself a real edge as a driver.

This project also gave me hands-on experience with full-stack development, API security, serverless architecture, and integrating large language models into a real product.

---

## Features

### AI Earnings Debrief — Powered by Claude
- One-click debrief powered by **Anthropic Claude Haiku** — analyzes every logged session and returns plain-English insights
- Identifies best days, times, cities, and weather conditions based on actual earnings data
- Flags underperforming shifts and gives 2–3 specific, actionable recommendations
- Anthropic API key stays server-side (Railway) — never exposed to the browser
- Animated loading skeleton while Claude processes the request

### Earnings Tracking
- Log delivery sessions with gross earnings, hours, miles, gas expenses, city, weather, and notes
- Smart time parser — type "5pm" or "9:30pm" instead of using dropdowns
- Undo delete with a 5-second toast notification
- DoorDash ZIP archive import — auto-parse official DoorDash data exports

### Dashboard
- Animated real take-home hero stat (after tax and gas)
- Weekly and monthly goal progress bars
- 14-day weather forecast for Newnan, GA — rainy days mean more orders
- Recent sessions at a glance

### Tax Season Summary
- Per-year breakdown of everything needed for IRS Schedule C:
  - Gross income, miles driven, mileage deduction, taxable income, SE tax owed, real take-home
- Uses IRS standard mileage method ($0.70/mile) — maximizes deductions vs. actual expense method
- No accountant needed — just open Settings at tax time

### Analytics
- Earnings breakdown by time window, day of week, weather, and city
- Best vs. worst sessions, week-over-week trends, annual earnings projection
- Market demographics via US Census ACS 5-Year Estimates — median income and population for each delivery zone
- Best shift combos ranked by $/hr

### Live Events
- Upcoming Atlanta/Georgia sports events (Braves, Falcons, Hawks, Atlanta United, Gwinnett Stripers, UGA, Georgia Tech)
- NBA playoff schedule + 2026 FIFA World Cup Atlanta games
- Earnings impact ratings (Massive / Very High / High / Low) to plan shifts around high-demand nights
- Event detection when logging — auto-suggests if a game may have affected earnings

---

## Security

Security was a deliberate focus throughout this project — not an afterthought.

| Layer | Implementation |
|---|---|
| **API key protection** | Vercel serverless proxy functions keep all secrets server-side — keys never reach the browser bundle |
| **Endpoint authentication** | All API endpoints require `X-API-Key` header — unauthenticated requests are rejected |
| **Input validation** | Insights proxy validates and caps request body before forwarding to Claude API |
| **CORS** | Locked to production Vercel domain only |
| **HTTP security headers** | `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` all set via `vercel.json` |
| **CSP directives** | `base-uri 'self'`, `object-src 'none'` — blocks base tag injection and plugin execution |
| **Security disclosure** | `/.well-known/security.txt` provides a responsible disclosure contact |
| **No hardcoded credentials** | All secrets via environment variables (Railway + Vercel) |

**Before/After:** The original build exposed the API key in the minified JavaScript bundle — visible to anyone in browser DevTools. After discovering this, I rebuilt the data flow using Vercel serverless functions as a secure proxy layer. The fix was validated with Mozilla Observatory and Pentest Tools scanners, which returned zero critical, high, or medium findings.

---

## Tech Stack

### Frontend
- **React 18** — Hooks-based UI, zero UI libraries, all custom components
- **Vite** — Build tooling and dev server
- **Vercel** — Hosting with automatic CI/CD on every GitHub push
- **Vercel Serverless Functions** — Secure proxy layer for all API calls

### Backend
- **Python 3.13 / FastAPI** — Async REST API with dependency injection for auth
- **psycopg2** — PostgreSQL driver
- **httpx + asyncio.gather** — Parallel async HTTP requests to sports APIs (cut load time ~4×)
- **Railway** — Backend hosting with automatic deploys

### Database
- **PostgreSQL** — Hosted on Railway, persistent cross-device session storage

### AI & External APIs
- **Anthropic Claude API** (`claude-haiku-4-5`) — AI earnings analysis and recommendations
- **TheSportsDB** — Atlanta/Georgia sports schedules
- **ESPN API** — College sports and NBA playoffs
- **Open-Meteo** — 14-day weather forecast (free, no key required)
- **US Census Bureau ACS** — Demographic data for delivery zone analysis

---

## Architecture

```
Browser (React/Vite on Vercel CDN)
         ↓  HTTPS
Vercel Serverless Functions  ← API keys live here, never in browser
         ↓  HTTPS + X-API-Key header
FastAPI Backend (Railway)
         ↓
PostgreSQL (Railway)

Backend also fetches in parallel:
TheSportsDB / ESPN / Open-Meteo / US Census
(via asyncio.gather — ~4× faster than sequential)

Claude API called server-side:
Railway → Anthropic API → insight returned to browser
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | None | Health check |
| GET | `/sessions` | ✅ Required | Get all sessions |
| POST | `/sessions` | ✅ Required | Create or update a session |
| PUT | `/sessions/{id}` | ✅ Required | Update a session |
| DELETE | `/sessions/{id}` | ✅ Required | Delete a session |
| GET | `/events` | ✅ Required | Upcoming Atlanta sports events (next 30 days) |
| GET | `/events/by-date?date=YYYY-MM-DD` | ✅ Required | Events on a specific date |
| POST | `/insights` | ✅ Required | Claude AI earnings analysis |

All endpoints proxied through Vercel serverless functions — the API key is never sent from the browser.

---

## Database Schema

```sql
CREATE TABLE sessions (
    id BIGINT PRIMARY KEY,
    date DATE NOT NULL,
    hours FLOAT,
    miles FLOAT,
    gross FLOAT,
    time_window VARCHAR(50),
    day VARCHAR(20),
    rained BOOLEAN DEFAULT FALSE,
    gas FLOAT DEFAULT 0,
    car_maint FLOAT DEFAULT 0,
    notes TEXT DEFAULT '',
    city VARCHAR(100) DEFAULT 'Newnan GA',
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Local Development

### Frontend
```bash
cd doordash-tracker
npm install
npm run dev
```

### Backend
```bash
cd doordash-api
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

**Environment variables required:**

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Railway | PostgreSQL connection string |
| `API_SECRET_KEY` | Railway + Vercel | API key for endpoint auth |
| `RAILWAY_API_URL` | Vercel (server-side only) | Railway backend URL |
| `ANTHROPIC_API_KEY` | Railway (server-side only) | Claude API key |
| `VITE_CENSUS_KEY` | Vercel | US Census Bureau API key |

---

## Roadmap

- [ ] ML earnings prediction model (scikit-learn) — needs ~50 sessions of training data
- [ ] Shift recommendation engine — suggest best times based on history + events + weather
- [ ] Push notifications for high-impact event nights

---

## Author

**Dennis Gomez** — Georgia State University  
Newnan, GA · [dennisgomezartica@gmail.com](mailto:dennisgomezartica@gmail.com)  
[github.com/dennisgomezartica-jpg](https://github.com/dennisgomezartica-jpg)
