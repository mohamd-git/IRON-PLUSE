"""
Auth router — 8 endpoints covering the full auth lifecycle.

POST /register          → create user, return tokens + user
POST /login             → verify credentials, return tokens + user
POST /refresh           → validate refresh token, issue new pair
POST /logout            → blacklist refresh token jti in Redis
POST /google            → Google OAuth, upsert user, return tokens
POST /forgot-password   → generate 6-char reset code → Redis (15 min)
POST /reset-password    → validate code, set new password
POST /verify-email      → validate token, set is_verified = True
"""

from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, get_redis
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── POST /register ────────────────────────────────────
@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new user account.
    Returns access + refresh tokens and a user object.
    """
    return await auth_service.register_user(
        email=data.email,
        username=data.username,
        display_name=data.display_name,
        password=data.password,
        db=db,
    )


# ── POST /login ──────────────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate with email + password.
    Returns access + refresh tokens and a user object.
    """
    return await auth_service.login_user(data.email, data.password, db)


# ── POST /refresh ────────────────────────────────────
@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Exchange a valid, non-blacklisted refresh token for a new
    access + refresh token pair.
    """
    return await auth_service.refresh_tokens(data.refresh_token, db, redis)


# ── POST /logout ─────────────────────────────────────
@router.post("/logout")
async def logout(
    data: LogoutRequest,
    redis: Redis = Depends(get_redis),
):
    """
    Blacklist the refresh token's jti in Redis with TTL =
    remaining token expiry seconds.
    """
    await auth_service.logout(data.refresh_token, redis)
    return {"message": "Logged out successfully"}


# ── POST /google ─────────────────────────────────────
@router.post("/google", response_model=AuthResponse)
async def google_auth(
    data: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a Google id_token, upsert the user
    (match on google_id or email), and return tokens.
    """
    return await auth_service.google_login(data.google_token, db)


# ── POST /forgot-password ────────────────────────────
@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Generate a 6-character reset code and store in Redis
    under key reset:{user_id} with 15-minute TTL.
    In production, send the code via email.
    """
    return await auth_service.forgot_password(data.email, db, redis)


# ── POST /reset-password ─────────────────────────────
@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Validate the reset code from Redis, hash the new password,
    update the user, and delete the code from Redis.
    """
    return await auth_service.reset_password(
        email=data.email,
        code=data.code,
        new_password=data.new_password,
        db=db,
        redis=redis,
    )


# ── POST /verify-email ───────────────────────────────
@router.post("/verify-email")
async def verify_email(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Validate the email verification token from Redis
    and set user.is_verified = True.
    """
    return await auth_service.verify_email(
        user_id=data.user_id,
        token=data.token,
        db=db,
        redis=redis,
    )
