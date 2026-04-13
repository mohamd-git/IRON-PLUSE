# IRON PULSE

A tactical fitness platform built for serious athletes. IRON PULSE combines workout tracking, AI-powered physique analysis, community features, and gym discovery into a single mobile-first app.

## Live App

- **Frontend:** https://iron-pluse-xl.vercel.app
- **Backend API:** https://ironpulse-backend-31ra.onrender.com
- **API Docs:** https://ironpulse-backend-31ra.onrender.com/docs

## Features

- **Workout Tracking** — Log exercises, sets, reps, and weight. Track volume over time with charts.
- **AI Physique Analysis** — Upload a photo and get a detailed AI assessment of your physique using Google Gemini.
- **Exercise Arsenal** — Browse a full exercise library with instructions, muscle group targeting, and difficulty levels.
- **Community Feed** — Post workout logs, PR celebrations, and motivational content. Search by hashtags.
- **Personal Records** — Track and celebrate PRs with a dedicated celebration screen.
- **Battle Log** — Full workout history with session summaries and volume metrics.
- **Gym Finder** — Discover nearby gyms using map-based search.
- **Find a Partner** — Connect with training partners in your area.
- **Challenges** — Join and compete in fitness challenges.
- **Signals (Notifications)** — Real-time notifications for likes, comments, and challenges.
- **VIP Membership** — Premium features and exclusive content.
- **Google OAuth** — Sign in with Google for quick access.
- **PWA** — Installable on Android and iPhone as a native-like app.

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- Framer Motion (animations)
- React Query (data fetching)
- Zustand (state management)
- React Router 7
- Recharts (charts)
- React Leaflet (maps)
- PWA via vite-plugin-pwa

### Backend
- FastAPI (Python)
- PostgreSQL (Neon serverless)
- SQLAlchemy async + asyncpg
- Alembic (migrations)
- Redis / Upstash (rate limiting, caching)
- Celery (background tasks)
- Google Gemini Flash (AI vision)
- Cloudflare R2 (file storage)
- Firebase FCM (push notifications)
- Resend (email)
- JWT authentication with refresh tokens

## Project Structure

```
IRON-PLUSE/
├── ironpulse-backend/      # FastAPI backend
│   ├── app/
│   │   ├── routers/        # API route handlers
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── core/           # Middleware, security, config
│   │   └── tasks/          # Celery background tasks
│   ├── alembic/            # Database migrations
│   └── requirements.txt
└── ironpulse-frontend/     # React frontend
    ├── src/
    │   ├── pages/          # App pages/screens
    │   ├── components/     # Reusable UI components
    │   ├── api/            # API client functions
    │   ├── store/          # Zustand state stores
    │   └── hooks/          # Custom React hooks
    └── package.json
```

## Running Locally

### Backend
```bash
cd ironpulse-backend
python -m venv venv
venv/Scripts/activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8085
```

### Frontend
```bash
cd ironpulse-frontend
npm install
npm run dev
```

## Installing on Your Phone

Open https://iron-pluse-xl.vercel.app in your phone browser:

- **Android:** Menu (3 dots) → Add to Home Screen
- **iPhone:** Share button → Add to Home Screen

## Deployment

- **Frontend:** Vercel (auto-deploys on push to main)
- **Backend:** Render (auto-deploys on push to main)
