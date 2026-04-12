"""
Physique Protocol router — progress photos (S3), body measurements, trend analytics.

POST /physique/photos          — multipart upload to S3 + create PhysiqueLog
GET  /physique/photos          — user's physique history
POST /physique/measurements    — create BodyMeasurement
GET  /physique/measurements    — user's measurement history
GET  /physique/progress        — weight trend, measurement deltas, goal progress
"""

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.gym import BodyMeasurement, PhysiqueLog
from app.models.user import User
from app.services.storage_service import upload_file

router = APIRouter(prefix="/physique", tags=["Physique Protocol"])


# ── Schemas ───────────────────────────────────────────
class PhysiqueLogOut(BaseModel):
    id: str
    photo_url: str | None = None
    weight_kg: float | None = None
    body_fat_pct: float | None = None
    notes: str | None = None
    logged_at: str
    model_config = {"from_attributes": True}


class MeasurementCreate(BaseModel):
    chest_cm: float | None = None
    waist_cm: float | None = None
    hips_cm: float | None = None
    arms_cm: float | None = None
    quads_cm: float | None = None
    calves_cm: float | None = None


class MeasurementOut(BaseModel):
    id: str
    chest_cm: float | None = None
    waist_cm: float | None = None
    hips_cm: float | None = None
    arms_cm: float | None = None
    quads_cm: float | None = None
    calves_cm: float | None = None
    logged_at: str
    model_config = {"from_attributes": True}


class WeightTrendItem(BaseModel):
    date: str
    weight_kg: float


class MeasurementDelta(BaseModel):
    current: float | None = None
    delta: float | None = None


class ProgressOut(BaseModel):
    weight_trend: list[WeightTrendItem]
    measurement_deltas: dict[str, MeasurementDelta]
    goal_progress: dict


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /physique/photos
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/photos", status_code=201)
async def upload_physique_photo(
    file: UploadFile = File(...),
    weight_kg: float | None = Form(None),
    body_fat_pct: float | None = Form(None),
    notes: str | None = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a physique progress photo to S3,
    create a PhysiqueLog record.
    """
    contents = await file.read()
    photo_url = await upload_file(
        contents,
        file.filename or "physique.jpg",
        file.content_type or "image/jpeg",
        folder=f"physique/{user.id}",
    )

    log = PhysiqueLog(
        user_id=user.id,
        photo_url=photo_url,
        weight_kg=weight_kg,
        body_fat_pct=body_fat_pct,
        notes=notes,
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)

    return {
        "id": log.id,
        "photo_url": log.photo_url,
        "weight_kg": log.weight_kg,
        "body_fat_pct": log.body_fat_pct,
        "notes": log.notes,
        "logged_at": log.logged_at.isoformat(),
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /physique/photos
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/photos", response_model=list[dict])
async def list_physique_photos(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PhysiqueLog)
        .where(PhysiqueLog.user_id == user.id)
        .order_by(PhysiqueLog.logged_at.desc())
    )
    logs = list(result.scalars().all())
    return [
        {
            "id": l.id,
            "photo_url": l.photo_url,
            "weight_kg": l.weight_kg,
            "body_fat_pct": l.body_fat_pct,
            "notes": l.notes,
            "logged_at": l.logged_at.isoformat(),
        }
        for l in logs
    ]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /physique/measurements
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/measurements", status_code=201)
async def create_measurement(
    data: MeasurementCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    m = BodyMeasurement(user_id=user.id, **data.model_dump())
    db.add(m)
    await db.flush()
    await db.refresh(m)
    return {
        "id": m.id,
        "logged_at": m.logged_at.isoformat(),
        **data.model_dump(),
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /physique/measurements
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/measurements", response_model=list[dict])
async def list_measurements(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BodyMeasurement)
        .where(BodyMeasurement.user_id == user.id)
        .order_by(BodyMeasurement.logged_at.desc())
    )
    return [
        {
            "id": m.id,
            "chest_cm": m.chest_cm,
            "waist_cm": m.waist_cm,
            "hips_cm": m.hips_cm,
            "arms_cm": m.arms_cm,
            "quads_cm": m.quads_cm,
            "calves_cm": m.calves_cm,
            "logged_at": m.logged_at.isoformat(),
        }
        for m in result.scalars().all()
    ]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /physique/progress
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/progress", response_model=ProgressOut)
async def physique_progress(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Progress analytics:
    - weight_trend: last 8 PhysiqueLogs [{date, weight_kg}]
    - measurement_deltas: latest vs previous for each metric
    - goal_progress: {current_weight, goal_weight, pct_complete}
    """
    # ── Weight trend (last 8) ─────────────────────────
    weight_q = await db.execute(
        select(PhysiqueLog)
        .where(
            PhysiqueLog.user_id == user.id,
            PhysiqueLog.weight_kg.isnot(None),
        )
        .order_by(PhysiqueLog.logged_at.desc())
        .limit(8)
    )
    weight_logs = list(weight_q.scalars().all())
    weight_trend = [
        WeightTrendItem(
            date=l.logged_at.strftime("%Y-%m-%d"),
            weight_kg=l.weight_kg,
        )
        for l in reversed(weight_logs)  # chronological order
    ]

    # ── Measurement deltas (latest vs previous) ──────
    meas_q = await db.execute(
        select(BodyMeasurement)
        .where(BodyMeasurement.user_id == user.id)
        .order_by(BodyMeasurement.logged_at.desc())
        .limit(2)
    )
    recent_meas = list(meas_q.scalars().all())

    fields = ["chest_cm", "waist_cm", "hips_cm", "arms_cm", "quads_cm", "calves_cm"]
    deltas: dict[str, MeasurementDelta] = {}

    if len(recent_meas) >= 1:
        latest = recent_meas[0]
        previous = recent_meas[1] if len(recent_meas) >= 2 else None

        for field in fields:
            current_val = getattr(latest, field, None)
            prev_val = getattr(previous, field, None) if previous else None
            delta_val = None
            if current_val is not None and prev_val is not None:
                delta_val = round(current_val - prev_val, 1)
            deltas[field] = MeasurementDelta(current=current_val, delta=delta_val)
    else:
        for field in fields:
            deltas[field] = MeasurementDelta()

    # ── Goal progress ─────────────────────────────────
    current_weight = weight_logs[0].weight_kg if weight_logs else user.weight_kg
    # Determine goal weight based on primary_goal
    goal_weight = current_weight  # default
    if user.primary_goal:
        goal_str = (
            user.primary_goal.value
            if hasattr(user.primary_goal, "value")
            else user.primary_goal
        )
        if goal_str == "fat_loss" and current_weight:
            goal_weight = round(current_weight * 0.85, 1)  # ~15% loss target
        elif goal_str == "mass_gain" and current_weight:
            goal_weight = round(current_weight * 1.10, 1)  # ~10% gain target

    pct_complete = 0.0
    if current_weight and goal_weight and user.weight_kg:
        total_change = abs(goal_weight - user.weight_kg)
        current_change = abs(current_weight - user.weight_kg)
        if total_change > 0:
            pct_complete = min(round((current_change / total_change) * 100, 1), 100)

    return ProgressOut(
        weight_trend=weight_trend,
        measurement_deltas=deltas,
        goal_progress={
            "current_weight": current_weight,
            "goal_weight": goal_weight,
            "pct_complete": pct_complete,
        },
    )
