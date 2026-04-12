"""
IRON PULSE — FastAPI Entry Point

Registers all routers, middleware, and exception handlers.
"""

import logging

from fastapi import FastAPI

from app.core.exceptions import register_exception_handlers
from app.core.middleware import register_middleware
from app.routers import (
    auth,
    users,
    workouts,
    exercises,
    sessions,
    community,
    challenges,
    messages,
    signals,
    partners,
    gyms,
    physique,
    vip,
    payments,
    admin,
    integrations,
    prs,
    ai,
)

# ── Logging ───────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(name)-28s  %(levelname)-5s  %(message)s")
logger = logging.getLogger("ironpulse")

# ── Application ───────────────────────────────────────
app = FastAPI(
    title="IRON PULSE API",
    description="Backend API for the IRON PULSE fitness platform — workouts, community, VIP, payments & AI coaching.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware & Exceptions ───────────────────────────
register_middleware(app)
register_exception_handlers(app)

# ── API v1 Routers ────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(workouts.router, prefix=API_PREFIX)
app.include_router(exercises.router, prefix=API_PREFIX)
app.include_router(sessions.router, prefix=API_PREFIX)
app.include_router(community.router, prefix=API_PREFIX)
app.include_router(challenges.router, prefix=API_PREFIX)
app.include_router(messages.router, prefix=API_PREFIX)
app.include_router(signals.router, prefix=API_PREFIX)
app.include_router(partners.router, prefix=API_PREFIX)
app.include_router(gyms.router, prefix=API_PREFIX)
app.include_router(physique.router, prefix=API_PREFIX)
app.include_router(vip.router, prefix=API_PREFIX)
app.include_router(payments.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)
app.include_router(integrations.router, prefix=API_PREFIX)
app.include_router(prs.router, prefix=API_PREFIX)
app.include_router(ai.router, prefix=API_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    return {
        "app": "IRON PULSE",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/integrations/health",
    }
