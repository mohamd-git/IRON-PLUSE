"""
User model — authentication, profile, fitness data, streaks.
All IDs are UUID strings.  Async-compatible via app.database.Base.
"""

import enum
import uuid
import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, Integer, JSON, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ── Enums ─────────────────────────────────────────────
class UserRole(str, enum.Enum):
    user = "user"
    vip = "vip"
    admin = "admin"


class ExperienceLevel(str, enum.Enum):
    recruit = "recruit"
    operator = "operator"
    elite = "elite"
    commander = "commander"


class PrimaryGoal(str, enum.Enum):
    mass_gain = "mass_gain"
    fat_loss = "fat_loss"
    endurance = "endurance"
    recomp = "recomp"


# ── Model ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    username: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )  # nullable for OAuth users
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Role & status ─────────────────────────────────
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False),
        default=UserRole.user,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── Fitness profile ───────────────────────────────
    experience_level: Mapped[ExperienceLevel | None] = mapped_column(
        Enum(ExperienceLevel, name="experience_level", native_enum=False),
        nullable=True,
    )
    primary_goal: Mapped[PrimaryGoal | None] = mapped_column(
        Enum(PrimaryGoal, name="primary_goal", native_enum=False),
        nullable=True,
    )
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    training_days_per_week: Mapped[int] = mapped_column(Integer, default=3)
    preferred_training_time: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )

    # ── Onboarding ────────────────────────────────────
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── OAuth ─────────────────────────────────────────
    google_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True
    )

    # ── Streaks ───────────────────────────────────────
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_workout_date: Mapped[datetime.date | None] = mapped_column(
        nullable=True
    )

    # ── Flexible settings blob ────────────────────────
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # ── Timestamps ────────────────────────────────────
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ── Relationships ─────────────────────────────────
    workout_sessions = relationship(
        "WorkoutSession", back_populates="user", lazy="selectin"
    )
    posts = relationship("Post", back_populates="user", lazy="selectin")
    vip_subscription = relationship(
        "VIPSubscription",
        back_populates="user",
        uselist=False,
        lazy="selectin",
    )
    physique_logs = relationship(
        "PhysiqueLog", back_populates="user", lazy="selectin"
    )
    measurements = relationship(
        "BodyMeasurement", back_populates="user", lazy="selectin"
    )
    notifications = relationship(
        "Notification", back_populates="user", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.role.value})>"
