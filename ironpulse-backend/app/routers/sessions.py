"""
Sessions router — full workout session lifecycle + battle log history.

POST /sessions/start              → create active session
POST /sessions/{id}/log-set       → log a set (Epley PR detection)
GET  /sessions/{id}               → session + logged sets
POST /sessions/{id}/complete      → finalize, streaks, Celery task
POST /sessions/{id}/abandon       → mark abandoned
GET  /sessions                    → paginated history + PR count
GET  /sessions/{id}/summary       → sets grouped by exercise, PR flags
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.workout import (
    ExerciseGroupSets,
    ExerciseOut,
    LogSetRequest,
    LogSetResponse,
    PRData,
    SessionCompleteResponse,
    SessionHistoryItem,
    SessionOut,
    SessionStartRequest,
    SessionSummaryOut,
    SessionWithSets,
    SetHistoryItem,
)
from app.services import workout_service

router = APIRouter(prefix="/sessions", tags=["Sessions"])


# ── POST /sessions/start ─────────────────────────────
@router.post("/start", response_model=SessionOut, status_code=201)
async def start_session(
    data: SessionStartRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new WorkoutSession with status='active'.
    Optionally link to a template.
    """
    session = await workout_service.start_session(
        user_id=user.id,
        name=data.name,
        template_id=data.template_id,
        db=db,
    )
    return session


# ── POST /sessions/{id}/log-set ──────────────────────
@router.post("/{session_id}/log-set", response_model=LogSetResponse)
async def log_set(
    session_id: str,
    data: LogSetRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Log a single set.
    1) Save WorkoutSet
    2) Epley 1RM = weight × (1 + reps/30)
    3) Compare to existing PersonalRecord
    4) If new PR → create PR + Notification + WebSocket event
    5) Add volume to session.total_volume_kg
    6) Return {set_id, is_pr, pr_data}
    """
    result = await workout_service.log_set(
        user_id=user.id,
        session_id=session_id,
        exercise_id=data.exercise_id,
        set_number=data.set_number,
        reps=data.reps,
        weight_kg=data.weight_kg,
        rpe=data.rpe,
        db=db,
    )

    pr_data = None
    if result["pr_data"]:
        pr_data = PRData(
            pr_id=result["pr_data"]["pr_id"],
            exercise_id=result["pr_data"]["exercise_id"],
            weight_kg=result["pr_data"]["weight_kg"],
            reps=result["pr_data"]["reps"],
            one_rep_max=result["pr_data"]["one_rep_max"],
            achieved_at=result["pr_data"]["achieved_at"],
        )

    return LogSetResponse(
        set_id=result["set_id"],
        is_pr=result["is_pr"],
        pr_data=pr_data,
    )


# ── GET /sessions/{id} ───────────────────────────────
@router.get("/{session_id}", response_model=SessionWithSets)
async def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a session with all logged sets so far."""
    session = await workout_service.get_session(session_id, db)
    sets = await workout_service.get_session_sets(session_id, db)

    return SessionWithSets(
        **SessionOut.model_validate(session).model_dump(),
        sets=[SetHistoryItem.model_validate(s) for s in sets],
    )


# ── POST /sessions/{id}/complete ─────────────────────
@router.post("/{session_id}/complete", response_model=SessionCompleteResponse)
async def complete_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Finalize the session:
    - Set completed_at, calculate duration_seconds
    - Update user streak (48h window)
    - Update longest_streak if needed
    - Trigger Celery task generate_session_analytics
    - Return full session summary
    """
    result = await workout_service.complete_session(
        session_id, user.id, db
    )
    return SessionCompleteResponse(
        session=SessionOut.model_validate(result["session"]),
        total_sets=result["total_sets"],
        total_volume_kg=result["total_volume_kg"],
        duration_seconds=result["duration_seconds"],
        pr_count=result["pr_count"],
        current_streak=result["current_streak"],
        longest_streak=result["longest_streak"],
    )


# ── POST /sessions/{id}/abandon ──────────────────────
@router.post("/{session_id}/abandon", response_model=SessionOut)
async def abandon_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark session as abandoned."""
    session = await workout_service.abandon_session(
        session_id, user.id, db
    )
    return session


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Battle Log (history)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ── GET /sessions ─────────────────────────────────────
@router.get("/", response_model=list[SessionHistoryItem])
async def list_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Paginated session history (most recent first).
    Each entry includes the PR count for that session.
    """
    items = await workout_service.list_user_sessions(
        user.id, db, skip=skip, limit=limit
    )
    return [
        SessionHistoryItem(
            **SessionOut.model_validate(item["session"]).model_dump(),
            pr_count=item["pr_count"],
        )
        for item in items
    ]


# ── GET /sessions/{id}/summary ───────────────────────
@router.get("/{session_id}/summary", response_model=SessionSummaryOut)
async def get_session_summary(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Full session detail: all sets grouped by exercise,
    PR flags, total volume, duration.
    """
    data = await workout_service.get_session_summary(session_id, db)

    exercise_groups = [
        ExerciseGroupSets(
            exercise=ExerciseOut.model_validate(g["exercise"]),
            sets=[SetHistoryItem.model_validate(s) for s in g["sets"]],
            has_pr=g["has_pr"],
        )
        for g in data["exercise_groups"]
        if g["exercise"] is not None
    ]

    return SessionSummaryOut(
        session=SessionOut.model_validate(data["session"]),
        exercise_groups=exercise_groups,
        total_volume_kg=data["total_volume_kg"],
        pr_count=data["pr_count"],
    )
