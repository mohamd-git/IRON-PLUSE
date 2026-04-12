"""
Workout models — Exercise, WorkoutTemplate, WorkoutSession, WorkoutSet, PersonalRecord.
All IDs are UUID strings.  Async-compatible via app.database.Base.
"""

import enum
import uuid
import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, Integer, JSON, String, Text, ForeignKey, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ── Enums ─────────────────────────────────────────────
class Difficulty(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class SessionStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    abandoned = "abandoned"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Exercise  (global library — not user-specific)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    muscle_groups: Mapped[list | None] = mapped_column(JSON, nullable=True)
    equipment: Mapped[list | None] = mapped_column(JSON, nullable=True)
    difficulty: Mapped[Difficulty] = mapped_column(
        Enum(Difficulty, name="exercise_difficulty", native_enum=False),
        default=Difficulty.intermediate,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    form_steps: Mapped[list | None] = mapped_column(JSON, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<Exercise {self.name}>"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  WorkoutTemplate  (pre-built plans by trainers / system)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class WorkoutTemplate(Base):
    __tablename__ = "workout_templates"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    difficulty: Mapped[Difficulty] = mapped_column(
        Enum(Difficulty, name="template_difficulty", native_enum=False),
        default=Difficulty.intermediate,
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, default=45)
    trainer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    trainer_avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_vip_only: Mapped[bool] = mapped_column(Boolean, default=False)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # JSON array: [{exercise_id, sets, reps, rest_seconds, notes}]
    exercises: Mapped[list | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<WorkoutTemplate {self.name}>"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  WorkoutSession  (user's actual workout log)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    template_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("workout_templates.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    completed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_volume_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    gym_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("gyms.id"), nullable=True
    )
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="session_status", native_enum=False),
        default=SessionStatus.active,
    )

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────
    user = relationship("User", back_populates="workout_sessions")
    sets = relationship(
        "WorkoutSet", back_populates="session", lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<WorkoutSession {self.name} ({self.status.value})>"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  WorkoutSet  (individual set within a session)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workout_sessions.id"), nullable=False
    )
    exercise_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("exercises.id"), nullable=False
    )
    set_number: Mapped[int] = mapped_column(Integer, nullable=False)
    reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_pr: Mapped[bool] = mapped_column(Boolean, default=False)
    rpe: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-10

    logged_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────
    session = relationship("WorkoutSession", back_populates="sets")

    def __repr__(self) -> str:
        return f"<WorkoutSet #{self.set_number} {self.weight_kg}kg x{self.reps}>"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  PersonalRecord
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class PersonalRecord(Base):
    __tablename__ = "personal_records"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    exercise_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("exercises.id"), nullable=False
    )
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    reps: Mapped[int] = mapped_column(Integer, nullable=False)
    one_rep_max: Mapped[float] = mapped_column(
        Float, nullable=False
    )  # Epley formula: weight * (1 + reps / 30)
    achieved_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    session_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("workout_sessions.id"), nullable=True
    )

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<PR {self.weight_kg}kg x{self.reps} (1RM={self.one_rep_max:.1f})>"
