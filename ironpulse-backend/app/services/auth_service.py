"""
Auth service — register, login, refresh, logout, Google OAuth,
forgot-password, reset-password, verify-email.

Redis key patterns:
  blacklist:{jti}   = "1"          TTL = remaining token expiry
  reset:{user_id}   = "6charcode"  TTL = 900 s  (15 min)
  verify:{user_id}  = "token"      TTL = 86400 s (24 h)
"""

import datetime
import logging
import secrets
import string

import httpx
from jose import JWTError
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import ConflictError, IronPulseError, NotFoundError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import AuthResponse, TokenResponse, UserBrief


# ── Helpers ───────────────────────────────────────────
def _user_brief(user: User) -> UserBrief:
    return UserBrief(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        role=user.role.value,
        is_verified=user.is_verified,
        onboarding_complete=user.onboarding_complete,
        avatar_url=user.avatar_url,
    )


def _make_auth_response(user: User) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=_user_brief(user),
    )


def _random_code(length: int = 6) -> str:
    """Generate a random uppercase alphanumeric code."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Register
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def register_user(
    email: str,
    username: str,
    display_name: str,
    password: str,
    db: AsyncSession,
) -> AuthResponse:
    # Check uniqueness
    existing_email = await db.execute(select(User).where(User.email == email))
    if existing_email.scalar_one_or_none():
        raise ConflictError("Email already registered")

    existing_username = await db.execute(
        select(User).where(User.username == username)
    )
    if existing_username.scalar_one_or_none():
        raise ConflictError("Username already taken")

    user = User(
        email=email,
        username=username,
        display_name=display_name,
        hashed_password=hash_password(password),
        onboarding_complete=False,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Send verification email (best-effort — don't fail registration if email fails)
    try:
        from app.database import get_redis as _get_redis
        from app.services.notification_service import send_verification_email

        redis = await _get_redis()
        token = await create_email_verification(user.id, redis)
        await send_verification_email(user.email, user.id, token)
    except Exception:
        logging.getLogger("ironpulse.auth").warning(
            "Verification email failed for %s (non-fatal)", email
        )

    return _make_auth_response(user)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Login
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def login_user(
    email: str, password: str, db: AsyncSession
) -> AuthResponse:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise IronPulseError("Invalid email or password", status_code=401)
    if not verify_password(password, user.hashed_password):
        raise IronPulseError("Invalid email or password", status_code=401)
    if not user.is_active:
        raise IronPulseError("Account is deactivated", status_code=403)

    return _make_auth_response(user)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Refresh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def refresh_tokens(
    refresh_token: str, db: AsyncSession, redis: Redis
) -> AuthResponse:
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise IronPulseError("Invalid token type", status_code=401)
    except JWTError:
        raise IronPulseError("Invalid or expired refresh token", status_code=401)

    jti = payload.get("jti")
    if jti:
        try:
            blacklisted = await redis.get(f"blacklist:{jti}")
            if blacklisted:
                raise IronPulseError("Token has been revoked", status_code=401)
        except Exception:
            pass

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise IronPulseError("User not found or inactive", status_code=401)

    return _make_auth_response(user)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Logout  (blacklist the refresh token's jti)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def logout(refresh_token: str, redis: Redis) -> None:
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        # Token already invalid — nothing to blacklist
        return

    jti = payload.get("jti")
    exp = payload.get("exp")
    if jti and exp:
        now = datetime.datetime.now(datetime.timezone.utc).timestamp()
        ttl = int(exp - now)
        if ttl > 0:
            try:
                await redis.set(f"blacklist:{jti}", "1", ex=ttl)
            except Exception:
                pass


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Google OAuth
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def google_login(
    google_token: str, db: AsyncSession
) -> AuthResponse:
    """Verify Google token, upsert user (match on google_id or email)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={google_token}"
        )
        if resp.status_code != 200:
            raise IronPulseError("Invalid Google token", status_code=401)
        info = resp.json()

    email = info.get("email")
    google_id = info.get("sub")
    if not email:
        raise IronPulseError("Google account has no email", status_code=400)

    # Try to find by google_id first, then by email
    result = await db.execute(
        select(User).where(User.google_id == google_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()

    if user:
        # Link google_id if not already set
        if not user.google_id:
            user.google_id = google_id
        if not user.avatar_url and info.get("picture"):
            user.avatar_url = info["picture"]
        await db.flush()
    else:
        # Create new user
        username = email.split("@")[0]
        # Ensure username uniqueness
        base_username = username
        counter = 1
        while True:
            existing = await db.execute(
                select(User).where(User.username == username)
            )
            if not existing.scalar_one_or_none():
                break
            username = f"{base_username}{counter}"
            counter += 1

        user = User(
            email=email,
            username=username,
            display_name=info.get("name", email.split("@")[0]),
            avatar_url=info.get("picture"),
            google_id=google_id,
            is_verified=True,  # Google-verified email
            onboarding_complete=False,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

    return _make_auth_response(user)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Forgot Password  —  store 6-char code in Redis
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def forgot_password(
    email: str, db: AsyncSession, redis: Redis
) -> dict:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        # Don't reveal whether account exists
        return {"message": "Reset code sent"}

    code = _random_code(6)
    await redis.set(f"reset:{user.id}", code, ex=900)  # 15 min TTL

    from app.services.notification_service import send_password_reset_email
    await send_password_reset_email(user.email, code)

    return {"message": "Reset code sent"}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Reset Password  —  validate code from Redis
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def reset_password(
    email: str,
    code: str,
    new_password: str,
    db: AsyncSession,
    redis: Redis,
) -> dict:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User")

    stored_code = await redis.get(f"reset:{user.id}")
    if not stored_code or stored_code != code:
        raise IronPulseError("Invalid or expired reset code", status_code=400)

    user.hashed_password = hash_password(new_password)
    await db.flush()

    # Delete the used code
    await redis.delete(f"reset:{user.id}")

    return {"message": "Password reset successful"}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Verify Email  —  validate token from Redis
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def verify_email(
    user_id: str,
    token: str,
    db: AsyncSession,
    redis: Redis,
) -> dict:
    stored_token = await redis.get(f"verify:{user_id}")
    if not stored_token or stored_token != token:
        raise IronPulseError(
            "Invalid or expired verification token", status_code=400
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User")

    user.is_verified = True
    await db.flush()

    # Delete the used token
    await redis.delete(f"verify:{user_id}")

    return {"message": "Email verified successfully"}


async def create_email_verification(
    user_id: str, redis: Redis
) -> str:
    """
    Generate a verification token and store in Redis.
    Returns the token (caller sends it via email).
    """
    token = secrets.token_urlsafe(32)
    await redis.set(f"verify:{user_id}", token, ex=86400)  # 24 h TTL
    return token
