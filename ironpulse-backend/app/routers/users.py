"""
Users router — profile CRUD, avatar upload, stats, onboarding.

GET   /users/me              — current user profile
PATCH /users/me              — update profile fields
POST  /users/me/avatar       — upload avatar to S3
GET   /users/me/stats        — workout stats & streaks
PATCH /users/me/onboarding   — complete onboarding
GET   /users/{user_id}       — public profile
"""

from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserOut, UserUpdate, UserStats
from app.services.analytics_service import get_user_stats
from app.services.storage_service import upload_file

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
async def get_profile(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
async def update_profile(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates = data.model_dump(exclude_unset=True)
    if updates:
        for key, value in updates.items():
            setattr(user, key, value)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contents = await file.read()
    url = await upload_file(
        contents,
        file.filename or "avatar.jpg",
        file.content_type or "image/jpeg",
    )
    user.avatar_url = url
    await db.flush()
    await db.refresh(user)
    return user


@router.get("/me/stats", response_model=UserStats)
async def my_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_stats(user.id, db)


@router.patch("/me/onboarding", response_model=UserOut)
async def complete_onboarding(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.onboarding_complete = True
    await db.flush()
    await db.refresh(user)
    return user


class FCMTokenUpdate(BaseModel):
    fcm_token: str


@router.post("/me/fcm-token")
async def register_fcm_token(
    data: FCMTokenUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register or update the user's Firebase FCM device token for push notifications."""
    settings_blob = user.settings or {}
    settings_blob["fcm_token"] = data.fcm_token
    user.settings = {**settings_blob}
    await db.flush()
    return {"message": "FCM token registered"}


@router.get("/{user_id}", response_model=UserOut)
async def get_user_by_id(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User")
    return user
