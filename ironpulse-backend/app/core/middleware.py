"""
Custom middleware — CORS, request logging, rate-limiting header.
"""

import time
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("ironpulse")


def register_middleware(app: FastAPI) -> None:
    """Attach all middleware to the FastAPI app instance."""

    # ── CORS ──────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://ironpulse.app",
            "https://www.ironpulse.app",
            # Vercel — covers production + all preview deployments
            "https://ironpulse-frontend.vercel.app",
            "https://ironpulse.vercel.app",
            "https://iron-pluse.vercel.app",
            # Local dev
            "http://localhost:3000",
            "http://localhost:3001",
            "http://192.168.1.103:3000",
            "http://192.168.1.103:3001",
        ],
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Redis Sliding-Window Rate Limits ──────────────
    @app.middleware("http")
    async def rate_limit(request: Request, call_next):
        from app.database import get_redis
        from fastapi.responses import JSONResponse
        
        redis = await get_redis()
        path = request.url.path
        client_ip = request.client.host if request.client else "127.0.0.1"
        
        # Identify Target Matrix
        if path.startswith("/api/v1/auth"):
            key = f"rl:auth:{client_ip}"
            limit, window = 10, 60
        elif path.startswith("/api/v1/ai"):
            # Rely on X-User-ID or Auth contexts parsed upstream if tracking precise user constraints
            user_id = request.headers.get("x-user-id", client_ip)
            key = f"rl:ai:{user_id}"
            limit, window = 20, 3600
        else:
            user_id = request.headers.get("x-user-id", client_ip)
            key = f"rl:api:{user_id}"
            limit, window = 200, 60
            
        now = time.time()
        # Redis ZSET Window physics 
        pipeline = redis.pipeline()
        pipeline.zremrangebyscore(key, 0, now - window)
        pipeline.zcard(key)
        # Random suffix avoids collision insertions dropping keys
        import uuid
        pipeline.zadd(key, {f"{now}-{uuid.uuid4()}": now})
        pipeline.expire(key, window)
        
        try:
            results = await pipeline.execute()
            request_count = results[1]
            
            if request_count >= limit:
                return JSONResponse(status_code=429, content={"detail": f"Rate limit physically exceeded. Limit: {limit}/{window}s."})
        except Exception as e:
            # Bypass safely if Redis crashes to prevent total lockouts in pre-launch
            pass
            
        response = await call_next(request)
        return response

    # ── Request timer / logger ────────────────────────
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s — %s — %.1f ms",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.1f}"
        return response
