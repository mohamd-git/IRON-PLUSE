"""
Signals (Notifications) router.

GET  /signals                — filtered + paginated + unread_count
POST /signals/{id}/read      — mark one as read
POST /signals/read-all       — mark all as read
GET  /signals/unread-count   — {count: N}
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_current_user
from app.models.community import Notification
from app.models.user import User
from app.schemas.community import NotificationOut, SignalFeedResponse

router = APIRouter(prefix="/signals", tags=["Signals"])


# ── GET /signals ──────────────────────────────────────
@router.get("/", response_model=SignalFeedResponse)
async def list_signals(
    notification_type: str | None = Query(
        None,
        alias="type",
        description="Filter by type: pr, challenge, social, system",
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Paginated notification feed.
    Includes `unread_count` for the badge.
    """
    query = (
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    )

    if notification_type:
        query = query.where(Notification.notification_type == notification_type)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    notifications = list(result.scalars().all())

    # Unread count (total, not filtered)
    unread_q = await db.execute(
        select(func.count()).where(
            and_(
                Notification.user_id == user.id,
                Notification.is_read.is_(False),
            )
        )
    )
    unread_count = unread_q.scalar() or 0

    return SignalFeedResponse(
        notifications=[
            NotificationOut.model_validate(n) for n in notifications
        ],
        unread_count=unread_count,
    )


# ── GET /signals/unread-count ─────────────────────────
@router.get("/unread-count")
async def unread_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(func.count()).where(
            and_(
                Notification.user_id == user.id,
                Notification.is_read.is_(False),
            )
        )
    )
    return {"count": result.scalar() or 0}


# ── POST /signals/{id}/read ──────────────────────────
@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise NotFoundError("Notification")
    if notification.user_id != user.id:
        raise NotFoundError("Notification")  # don't reveal existence

    notification.is_read = True
    await db.flush()
    return {"message": "Marked as read"}


# ── POST /signals/read-all ───────────────────────────
@router.post("/read-all")
async def mark_all_read(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(
            and_(
                Notification.user_id == user.id,
                Notification.is_read.is_(False),
            )
        )
        .values(is_read=True)
    )
    await db.flush()
    return {"message": "All notifications marked as read"}
