"""
Gyms router — gym locator with Haversine distance, check-in, nearby search.

GET  /gyms              — filtered + paginated
GET  /gyms/nearby       — Haversine top-5 by distance
GET  /gyms/{id}         — full detail
POST /gyms/{id}/checkin — link gym to active session
"""

import math

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.gym import Gym
from app.models.user import User
from app.models.workout import WorkoutSession, SessionStatus

router = APIRouter(prefix="/gyms", tags=["Gyms"])


# ── Schemas ───────────────────────────────────────────
class GymOut(BaseModel):
    id: str
    name: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    hours: dict | None = None
    is_24h: bool = False
    is_vip_partner: bool = False
    features: list | None = None
    photo_urls: list | None = None
    rating: float | None = None
    review_count: int = 0
    model_config = {"from_attributes": True}


class GymNearbyOut(GymOut):
    distance_km: float = 0.0


class GymCreate(BaseModel):
    name: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    hours: dict | None = None
    is_24h: bool = False
    is_vip_partner: bool = False
    features: list[str] = []
    photo_urls: list[str] = []
    rating: float | None = None


# ── Haversine ─────────────────────────────────────────
def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points
    on Earth using the Haversine formula.
    Returns distance in kilometres.
    """
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /gyms
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/", response_model=list[GymOut])
async def list_gyms(
    is_24h: bool | None = Query(None),
    is_vip_partner: bool | None = Query(None),
    features: str | None = Query(
        None, description="Comma-separated feature filter, e.g. 'sauna,pool'"
    ),
    city: str | None = Query(None),
    state: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Filter gyms by 24h, VIP partner, features (array contains), city, state."""
    from sqlalchemy import func as sqlfunc

    query = select(Gym)

    if is_24h is not None:
        query = query.where(Gym.is_24h == is_24h)
    if is_vip_partner is not None:
        query = query.where(Gym.is_vip_partner == is_vip_partner)
    if city:
        query = query.where(Gym.city.ilike(f"%{city}%"))
    if state:
        query = query.where(Gym.state.ilike(f"%{state}%"))
    if features:
        # Filter gyms that contain ALL specified features in JSON array
        for feat in features.split(","):
            feat = feat.strip()
            if feat:
                query = query.where(
                    sqlfunc.cast(Gym.features, Gym.features.type)
                    .cast(type_=sqlfunc.text())
                    .ilike(f"%{feat}%")
                )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /gyms/nearby
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/nearby", response_model=list[GymNearbyOut])
async def nearby_gyms(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    radius_km: float = Query(10, ge=0.1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Return the top 5 gyms within radius_km, sorted by distance ascending.
    Uses the Haversine formula for great-circle distance.
    """
    # Fetch all gyms with coordinates
    result = await db.execute(
        select(Gym).where(
            Gym.latitude.isnot(None),
            Gym.longitude.isnot(None),
        )
    )
    all_gyms = list(result.scalars().all())

    # Calculate distance for each
    scored: list[tuple[Gym, float]] = []
    for gym in all_gyms:
        dist = _haversine(lat, lng, gym.latitude, gym.longitude)
        if dist <= radius_km:
            scored.append((gym, round(dist, 2)))

    # Sort by distance, take top 5
    scored.sort(key=lambda x: x[1])
    top5 = scored[:5]

    return [
        GymNearbyOut(
            **GymOut.model_validate(gym).model_dump(),
            distance_km=dist,
        )
        for gym, dist in top5
    ]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /gyms/{id}
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/{gym_id}", response_model=GymOut)
async def get_gym(gym_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Gym).where(Gym.id == gym_id))
    gym = result.scalar_one_or_none()
    if not gym:
        raise NotFoundError("Gym")
    return gym


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /gyms/{id}/checkin
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/{gym_id}/checkin")
async def gym_checkin(
    gym_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check in to a gym.
    If the user has an active WorkoutSession, links the gym to it.
    """
    # Verify gym exists
    gym_result = await db.execute(select(Gym).where(Gym.id == gym_id))
    gym = gym_result.scalar_one_or_none()
    if not gym:
        raise NotFoundError("Gym")

    linked_session_id: str | None = None

    # Find user's active session and link gym
    session_result = await db.execute(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == SessionStatus.active,
        )
    )
    active_session = session_result.scalar_one_or_none()
    if active_session:
        active_session.gym_id = gym_id
        linked_session_id = active_session.id
        await db.flush()

    return {
        "message": f"Checked in to {gym.name}",
        "gym_id": gym_id,
        "gym_name": gym.name,
        "linked_session_id": linked_session_id,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /gyms (admin only)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/", response_model=GymOut, status_code=201)
async def create_gym(
    data: GymCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    gym = Gym(**data.model_dump())
    db.add(gym)
    await db.flush()
    await db.refresh(gym)
    return gym
