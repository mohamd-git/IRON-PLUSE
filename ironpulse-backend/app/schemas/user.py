"""
User profile schemas — updated for UUID-based model.
"""

import datetime
from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: str
    email: EmailStr
    username: str
    display_name: str
    avatar_url: str | None = None
    bio: str | None = None
    role: str
    is_active: bool = True
    is_verified: bool = False
    experience_level: str | None = None
    primary_goal: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    training_days_per_week: int = 3
    preferred_training_time: str | None = None
    onboarding_complete: bool = False
    current_streak: int = 0
    longest_streak: int = 0
    last_workout_date: datetime.date | None = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = None
    username: str | None = None
    avatar_url: str | None = None
    experience_level: str | None = None
    primary_goal: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    training_days_per_week: int | None = None
    preferred_training_time: str | None = None
    onboarding_complete: bool | None = None
    settings: dict | None = None


class UserStats(BaseModel):
    total_workouts: int = 0
    total_sessions: int = 0
    total_duration_min: int = 0
    total_volume_kg: float = 0
    current_streak: int = 0
    longest_streak: int = 0
