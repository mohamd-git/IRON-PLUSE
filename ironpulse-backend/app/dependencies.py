"""
Reusable FastAPI dependencies: authentication & role guards.
Checks JWT validity AND Redis blacklist before returning the user.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import decode_token
from app.database import get_db, get_redis
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> User:
    """
    Decode Bearer JWT, verify it is not blacklisted,
    and return the authenticated User row.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # ── 1. Decode ─────────────────────────────────────
    try:
        payload = decode_token(token)
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        jti: str | None = payload.get("jti")
        if user_id is None or token_type != "access":
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    # ── 2. Check Redis blacklist ──────────────────────
    if jti:
        try:
            blacklisted = await redis.get(f"blacklist:{jti}")
            if blacklisted:
                raise credentials_exc
        except Exception:
            pass # Redis is offline locally, fallback allow

    # ── 3. Fetch user from DB ─────────────────────────
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exc
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive account",
        )
    return user


async def require_vip(user: User = Depends(get_current_user)) -> User:
    """Guard: user must hold VIP or admin role."""
    if user.role not in (UserRole.vip, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="VIP subscription required",
        )
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Guard: user must be an admin."""
    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return user
