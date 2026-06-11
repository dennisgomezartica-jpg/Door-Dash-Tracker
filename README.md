# DoorDash Earnings Tracker

A full-stack web application to track, analyze, and optimize DoorDash delivery earnings. Built to replace a manual Excel workflow with a modern, cross-device app featuring live data integrations.

🔗 **Live App:** [door-dash-tracker-3xmi.vercel.app](https://door-dash-tracker-3xmi.vercel.app)  
🔗 **API:** [doordash-api-production.up.railway.app](https://doordash-api-production.up.railway.app)

---

## Features

- **Dashboard** — Net profit hero stat, weekly/monthly goal tracking, all-time stats, recent sessions
- **Session Logging** — Log delivery sessions with earnings, hours, miles, weather, city, and notes
- **Analytics** — Earnings breakdown by time window, day of week, weather, and city. Best/worst sessions, week-over-week trends, annual projections
- **Live Sports Events** — Upcoming Atlanta/Georgia sports events (Braves, Falcons, Hawks, Atlanta United, Gwinnett Stripers, UGA, Georgia Tech) with earnings impact ratings to help plan shifts around high-demand nights
- **NBA Finals & World Cup** — Live NBA playoff data + 2026 FIFA World Cup Atlanta schedule
- **14-Day Weather Forecast** — Newnan, GA forecast to identify high-demand rainy days
- **Cross-Device Sync** — Sessions saved to PostgreSQL database, accessible from any device
- **CSV & Excel Export** — Download all session data with totals and tax calculations
- **DoorDash Archive Import** — Upload DoorDash ZIP data export to auto-import sessions

---

## Tech Stack

### Frontend
- **React** — Mobile-first UI with hooks and component architecture
- **Vite** — Build tool and dev server
- **Vercel** — Hosting and CI/CD (auto-deploys on GitHub push)

### Backend
- **Python 3.13** — Backend language
- **FastAPI** — REST API framework
- **psycopg2** — PostgreSQL driver
- **httpx** — Async HTTP client for third-party API calls
- **Railway** — Backend hosting and CI/CD

### Database
- **PostgreSQL** — Hosted on Railway

### External APIs
- **TheSportsDB** — Atlanta/Georgia pro and college sports schedules
- **ESPN API** — College baseball, basketball, NBA playoffs
- **Open-Meteo** — 14-day weather forecast (no API key required)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/sessions` | Get all sessions |
| POST | `/sessions` | Create or update a session |
| PUT | `/sessions/{id}` | Update a session |
| DELETE | `/sessions/{id}` | Delete a session |
| GET | `/events` | Get upcoming Atlanta sports events |

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
Browser (React) → Vercel
       ↓
FastAPI Backend → Railway
       ↓
PostgreSQL Database → Railway
       ↓
TheSportsDB / ESPN / Open-Meteo APIs
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

---

## Roadmap

- [ ] ML earnings prediction model (scikit-learn)
- [ ] Event impact confirmation when logging sessions
- [ ] Holidays calendar in Events tab
- [ ] Shift recommendation engine based on history + events + weather

---

## Author

Built by Dennis Gomez — Newnan, GA
