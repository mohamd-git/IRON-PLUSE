"""
Auth request / response schemas.
"""

import datetime
from pydantic import BaseModel, EmailStr


# ── Register ──────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    display_name: str
    password: str


# ── Login ─────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Tokens ────────────────────────────────────────────
class UserBrief(BaseModel):
    """Minimal user blob returned alongside tokens."""
    id: str
    email: str
    username: str
    display_name: str
    role: str
    is_verified: bool
    onboarding_complete: bool
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    """Returned by register, login, refresh, google endpoints."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserBrief


class TokenResponse(BaseModel):
    """Lightweight — used when only tokens change (e.g. refresh)."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ── Refresh / Logout ─────────────────────────────────
class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


# ── Google OAuth ──────────────────────────────────────
class GoogleAuthRequest(BaseModel):
    google_token: str


# ── Forgot / Reset password ──────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str


# ── Email verification ───────────────────────────────
class VerifyEmailRequest(BaseModel):
    user_id: str
    token: str
