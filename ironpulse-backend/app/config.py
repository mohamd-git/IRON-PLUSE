"""
Centralised configuration — reads every value from .env via pydantic-settings.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./ironpulse.db"

    # ── Redis / Celery ────────────────────────────────
    REDIS_URL: str = "redis://redis:6379/0"

    # ── JWT / Auth ────────────────────────────────────
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Cloudflare R2 / AWS S3 ────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "auto"
    AWS_S3_ENDPOINT: str = ""      # https://ACCOUNT_ID.r2.cloudflarestorage.com
    R2_PUBLIC_BUCKET_URL: str = "" # https://pub-xxx.r2.dev  (set after enabling public access)

    # ── Payment gateways (Malaysia) ───────────────────
    BILLPLZ_API_KEY: str = ""
    BILLPLZ_COLLECTION_ID: str = ""
    TOYYIBPAY_USER_SECRET_KEY: str = ""
    TOYYIBPAY_CATEGORY_CODE: str = ""

    # ── AI (Groq preferred, OpenAI fallback) ─────────
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""   # Free vision API — aistudio.google.com

    # ── Google OAuth ──────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # ── Email (Resend) ────────────────────────────────
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "IRON PULSE <noreply@ironpulse.app>"

    # ── Push Notifications (Firebase FCM) ────────────
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "firebase-service-account.json"

    # ── Wearable Integrations ─────────────────────────
    GARMIN_CONSUMER_KEY: str = ""

    # ── Owner bootstrap ───────────────────────────────
    ADMIN_SECRET: str = ""  # Set this to a strong secret; used once to promote first admin

    # ── General ───────────────────────────────────────
    API_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
