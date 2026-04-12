"""
Personal Records router.

GET  /prs                   — all PRs for current user, grouped by exercise
GET  /prs/recent            — PRs from last 30 days, with session data
GET  /prs/{exercise_id}     — PRs + last 8 sessions history for that exercise
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.workout import (
    ExerciseOut,
    PRByExercise,
    PROut,
    PRWithSession,
    SetHistoryItem,
)
from app.services import workout_service

router = APIRouter(prefix="/prs", tags=["Personal Records"])


# ── GET /prs ──────────────────────────────────────────
@router.get("/", response_model=list[PRByExercise])
async def list_all_prs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """All personal records for the current user, grouped by exercise."""
    groups = await workout_service.get_user_prs_grouped(user.id, db)
    return [
        PRByExercise(
            exercise=ExerciseOut.model_validate(g["exercise"]),
            records=[PROut.model_validate(r) for r in g["records"]],
        )
        for g in groups
        if g["exercise"] is not None
    ]


# ── GET /prs/recent ──────────────────────────────────
@router.get("/recent", response_model=list[PRWithSession])
async def recent_prs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """PRs achieved in the last 30 days, enriched with exercise + session names."""
    items = await workout_service.get_recent_prs(user.id, db, days=30)
    return [
        PRWithSession(
            **PROut.model_validate(item["pr"]).model_dump(),
            exercise_name=item["exercise_name"],
            session_name=item["session_name"],
        )
        for item in items
    ]


# ── GET /prs/{exercise_id} ───────────────────────────
@router.get("/{exercise_id}")
async def get_prs_for_exercise(
    exercise_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    All PRs + last 8 logged sets for a specific exercise.
    Useful for the exercise detail / history screen.
    """
    data = await workout_service.get_prs_for_exercise(
        user.id, exercise_id, db
    )
    return {
        "exercise": ExerciseOut.model_validate(data["exercise"]),
        "records": [PROut.model_validate(r) for r in data["records"]],
        "recent_sets": [
            SetHistoryItem.model_validate(s) for s in data["recent_sets"]
        ],
    }
