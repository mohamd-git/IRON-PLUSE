"""
Exercises router — public exercise library with optional auth.

GET  /exercises          — filtered + paginated (public)
GET  /exercises/{id}     — exercise + user's last 8 sets (if authed)
POST /exercises          — admin only
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import decode_token
from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.workout import ExerciseCreate, ExerciseDetailOut, ExerciseOut, SetHistoryItem
from app.services import workout_service

router = APIRouter(prefix="/exercises", tags=["Exercises"])

_optional_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def _optional_user_id(
    token: str | None = Depends(_optional_oauth2),
) -> str | None:
    """Extract user_id from Bearer token if present, else None."""
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        return payload.get("sub")
    except JWTError:
        return None


# ── GET /exercises ────────────────────────────────────
@router.get("/", response_model=list[ExerciseOut])
async def list_exercises(
    category: str | None = Query(None),
    muscle_group: str | None = Query(None),
    equipment: str | None = Query(None),
    difficulty: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Browse the exercise library. Public endpoint."""
    return await workout_service.list_exercises(
        db,
        category=category,
        muscle_group=muscle_group,
        equipment=equipment,
        difficulty=difficulty,
        search=search,
        skip=skip,
        limit=limit,
    )


# ── GET /exercises/{id} ──────────────────────────────
@router.get("/{exercise_id}", response_model=ExerciseDetailOut)
async def get_exercise(
    exercise_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(_optional_user_id),
):
    """
    Return exercise detail. If the caller is authenticated,
    also returns the user's last 8 logged sets for this exercise.
    """
    exercise = await workout_service.get_exercise(exercise_id, db)

    recent_sets: list = []
    if user_id:
        raw_sets = await workout_service.get_user_recent_sets(
            user_id, exercise_id, db, limit=8
        )
        recent_sets = [
            SetHistoryItem.model_validate(s) for s in raw_sets
        ]

    return ExerciseDetailOut(
        exercise=ExerciseOut.model_validate(exercise),
        recent_sets=recent_sets,
    )


# ── POST /exercises (admin) ──────────────────────────
@router.post("/", response_model=ExerciseOut, status_code=201)
async def create_exercise(
    data: ExerciseCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new exercise in the library (admin only)."""
    return await workout_service.create_exercise(data.model_dump(), db)
