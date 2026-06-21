# DoorDash Earnings Tracker

A full-stack web application I built to track, analyze, and optimize my DoorDash delivery earnings. Designed and developed from scratch to replace a manual Excel workflow — featuring real-time data integrations, tax calculations, and a PostgreSQL-backed cross-device sync system.

🔗 **Live App:** [door-dash-tracker-3xmi.vercel.app](https://door-dash-tracker-3xmi.vercel.app)  
🔗 **API:** [doordash-api-production.up.railway.app](https://doordash-api-production.up.railway.app)  
🔗 **GitHub:** [github.com/dennisgomezartica-jpg/Door-Dash-Tracker](https://github.com/dennisgomezartica-jpg/Door-Dash-Tracker)

---

## Why I Built This

I was tracking my DoorDash earnings in a spreadsheet and kept asking questions it couldn't answer — which nights actually pay best? Does rain help? Am I working too many miles for too little pay? I built this app to answer those questions and make tax season stress-free.

---

## Features

### Earnings Tracking
- Log delivery sessions with gross earnings, hours, miles, gas expenses, city, weather, and notes
- Smart time parser — type "5pm" or "9:30pm" instead of dropdowns
- Undo delete with a 5-second toast notification
- DoorDash ZIP archive import — auto-parse official DoorDash data exports

### Dashboard
- Animated net profit hero stat with real take-home (after tax and gas)
- Weekly and monthly goal progress bars
- 14-day weather forecast for Newnan, GA — rainy days mean more orders
- Recent sessions at a glance

### Tax Season Summary
- Per-year breakdown of everything needed for Schedule C:
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

### Security
- API key authentication on all session endpoints (`X-API-Key` header)
- CORS locked to production Vercel domain
- No hardcoded credentials — all secrets via environment variables

---

## Tech Stack

### Frontend
- **React 18** — Hooks-based UI, zero UI libraries, all custom components
- **Vite** — Build tooling and dev server
- **Vercel** — Hosting with automatic CI/CD on every GitHub push

### Backend
- **Python 3.13 / FastAPI** — Async REST API with dependency injection for auth
- **psycopg2** — PostgreSQL driver
- **httpx + asyncio.gather** — Parallel async HTTP requests to sports APIs (cut load time ~4×)
- **Railway** — Backend hosting with automatic deploys

### Database
- **PostgreSQL** — Hosted on Railway, persistent cross-device session storage

### External APIs
- **TheSportsDB** — Atlanta/Georgia sports schedules
- **ESPN API** — College sports and NBA playoffs
- **Open-Meteo** — 14-day weather forecast (free, no key required)
- **US Census Bureau ACS** — Demographic data for delivery zone analysis

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/sessions` | Get all sessions |
| POST | `/sessions` | Create or update a session |
| PUT | `/sessions/{id}` | Update a session |
| DELETE | `/sessions/{id}` | Delete a session |
| GET | `/events` | Get upcoming Atlanta sports events (next 30 days) |
| GET | `/events/by-date?date=YYYY-MM-DD` | Get events on a specific date |

All session endpoints require `X-API-Key` header.

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

## Architecture

```
Browser (React/Vite) → Vercel CDN
         ↓  HTTPS + API Key
FastAPI Backend → Railway
         ↓
PostgreSQL → Railway
         ↓
TheSportsDB / ESPN / Open-Meteo / US Census APIs
         (fetched in parallel via asyncio.gather)
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
- `DATABASE_URL` — PostgreSQL connection string
- `API_SECRET_KEY` — API key for session endpoint auth
- `VITE_API_KEY` — Frontend API key (Vercel env var)
- `VITE_CENSUS_KEY` — US Census Bureau API key

---

## Roadmap

- [ ] ML earnings prediction model (scikit-learn) — needs ~50 sessions of training data
- [ ] Shift recommendation engine — suggest best times based on history + events + weather
- [ ] Push notifications for high-impact event nights

---

## Author

**Dennis Gomez** — Georgia State University  
Newnan, GA · [dennisgomezartica@gmail.com](mailto:dennisgomezartica@gmail.com)
