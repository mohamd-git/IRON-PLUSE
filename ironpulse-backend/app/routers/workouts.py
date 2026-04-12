"""
Templates / Training Guides router.

GET  /templates          — filtered list, VIP-gated
GET  /templates/{id}     — template + expanded exercise list
POST /templates          — admin only
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.user import User, UserRole
from app.schemas.workout import (
    ExerciseOut,
    TemplateCreate,
    TemplateDetailOut,
    TemplateOut,
)
from app.services import workout_service

router = APIRouter(prefix="/templates", tags=["Templates"])


# ── GET /templates ────────────────────────────────────
@router.get("/", response_model=list[TemplateOut])
async def list_templates(
    category: str | None = Query(None),
    difficulty: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List workout templates.
    VIP-only templates are only returned if the user's role is vip or admin.
    """
    is_vip = user.role in (UserRole.vip, UserRole.admin)
    return await workout_service.list_templates(
        db,
        category=category,
        difficulty=difficulty,
        is_vip=is_vip,
        skip=skip,
        limit=limit,
    )


# ── GET /templates/{id} ──────────────────────────────
@router.get("/{template_id}", response_model=TemplateDetailOut)
async def get_template(
    template_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return template detail with fully expanded exercise objects.
    VIP-only templates require VIP or admin role.
    """
    tmpl = await workout_service.get_template(template_id, db)

    # Gate VIP-only templates
    if tmpl.is_vip_only and user.role not in (UserRole.vip, UserRole.admin):
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="VIP subscription required for this template",
        )

    # Expand exercise list from the JSON
    exercise_details: list[ExerciseOut] = []
    if tmpl.exercises:
        exercise_ids = [
            item["exercise_id"]
            for item in tmpl.exercises
            if isinstance(item, dict) and "exercise_id" in item
        ]
        exercises = await workout_service.get_exercises_by_ids(
            exercise_ids, db
        )
        exercise_details = [
            ExerciseOut.model_validate(e) for e in exercises
        ]

    return TemplateDetailOut(
        template=TemplateOut.model_validate(tmpl),
        exercise_details=exercise_details,
    )


# ── POST /templates (admin) ──────────────────────────
@router.post("/", response_model=TemplateOut, status_code=201)
async def create_template(
    data: TemplateCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workout template (admin only)."""
    payload = data.model_dump()
    # Serialize exercises as list of dicts for JSON column
    payload["exercises"] = [e.model_dump() for e in data.exercises]
    return await workout_service.create_template(payload, db)
