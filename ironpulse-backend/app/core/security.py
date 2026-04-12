"""
Password hashing & JWT token helpers.
Tokens include a jti (JWT ID) for blacklisting via Redis.

Uses bcrypt directly (passlib 1.7.4 is incompatible with bcrypt 4.x).
"""

import datetime
import uuid

import bcrypt
from jose import JWTError, jwt

from app.config import settings


# ── Password helpers ──────────────────────────────────
def hash_password(password: str) -> str:
    """Return a bcrypt hash of the given plaintext password."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── JWT helpers ───────────────────────────────────────
def create_access_token(user_id: str) -> str:
    """
    Create a short-lived access JWT.
    Payload: {sub, exp, type, jti}
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    expire = now + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": now,
        "type": "access",
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """
    Create a long-lived refresh JWT.
    Payload: {sub, exp, type, jti}
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    expire = now + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": now,
        "type": "refresh",
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT.
    Returns dict with keys: sub, exp, type, jti.
    Raises JWTError on invalid / expired tokens.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
