"""
Analytics service — user stats, streaks.
Updated for UUID-based models.
"""

import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout import WorkoutSession, WorkoutSet
from app.schemas.user import UserStats


async def get_user_stats(user_id: str, db: AsyncSession) -> UserStats:
    """Compute aggregate stats for a user."""
    from app.models.user import User

    # Total sessions (completed)
    total_sessions_q = await db.execute(
        select(func.count()).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == "completed",
        )
    )
    total_sessions = total_sessions_q.scalar() or 0

    # Total duration
    total_duration_q = await db.execute(
        select(func.coalesce(func.sum(WorkoutSession.duration_seconds), 0)).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == "completed",
        )
    )
    total_duration_sec = total_duration_q.scalar() or 0

    # Total volume
    total_volume_q = await db.execute(
        select(func.coalesce(func.sum(WorkoutSession.total_volume_kg), 0)).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == "completed",
        )
    )
    total_volume = total_volume_q.scalar() or 0

    # Get user for streaks
    user_q = await db.execute(select(User).where(User.id == user_id))
    user = user_q.scalar_one_or_none()

    return UserStats(
        total_workouts=total_sessions,
        total_sessions=total_sessions,
        total_duration_min=total_duration_sec // 60,
        total_volume_kg=float(total_volume),
        current_streak=user.current_streak if user else 0,
        longest_streak=user.longest_streak if user else 0,
    )
