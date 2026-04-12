"""
Partner Discovery router.

GET  /partners/discover            — scored partner recommendations
POST /partners/{user_id}/connect   — send intro message or challenge
"""

import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import IronPulseError, NotFoundError
from app.core.websocket import manager
from app.database import get_db
from app.dependencies import get_current_user
from app.models.community import Message
from app.models.user import User
from app.schemas.community import MessageCreate, MessageOut, PartnerCandidate

router = APIRouter(prefix="/partners", tags=["Partners"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /partners/discover
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/discover", response_model=list[PartnerCandidate])
async def discover_partners(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return up to 20 users scored by compatibility:
    - Same training_days_per_week (±1)   → +2
    - Same primary_goal                  → +3
    - Same experience_level              → +1
    - Active in last 7 days              → +2
    Excludes self and users already messaged.
    Sorted by score descending.
    """
    seven_days_ago = (
        datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)
    ).date()

    # Get user IDs we've already connected with (sent or received messages)
    connected_q = await db.execute(
        select(
            func.distinct(
                func.coalesce(
                    # Get the other party's ID
                    func.nullif(Message.sender_id, user.id),
                    Message.recipient_id,
                )
            )
        ).where(
            or_(
                Message.sender_id == user.id,
                Message.recipient_id == user.id,
            )
        )
    )
    connected_ids = {row[0] for row in connected_q.all() if row[0]}
    connected_ids.add(user.id)  # exclude self

    # Fetch candidates
    result = await db.execute(
        select(User)
        .where(
            and_(
                User.is_active.is_(True),
                User.id.not_in(connected_ids),
            )
        )
        .limit(200)  # pool to score from
    )
    candidates = list(result.scalars().all())

    # Score each candidate
    scored: list[tuple[User, int]] = []
    for c in candidates:
        score = 0

        # Training days match (±1)
        if (
            c.training_days_per_week is not None
            and user.training_days_per_week is not None
            and abs(c.training_days_per_week - user.training_days_per_week) <= 1
        ):
            score += 2

        # Same primary goal
        if (
            c.primary_goal is not None
            and user.primary_goal is not None
            and c.primary_goal == user.primary_goal
        ):
            score += 3

        # Same experience level
        if (
            c.experience_level is not None
            and user.experience_level is not None
            and c.experience_level == user.experience_level
        ):
            score += 1

        # Active in last 7 days
        if c.last_workout_date and c.last_workout_date >= seven_days_ago:
            score += 2

        scored.append((c, score))

    # Sort descending and take top 20
    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:20]

    return [
        PartnerCandidate(
            id=c.id,
            username=c.username,
            display_name=c.display_name,
            avatar_url=c.avatar_url,
            experience_level=c.experience_level.value
            if c.experience_level
            else None,
            primary_goal=c.primary_goal.value if c.primary_goal else None,
            training_days_per_week=c.training_days_per_week or 3,
            current_streak=c.current_streak or 0,
            compatibility_score=score,
        )
        for c, score in top
    ]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /partners/{user_id}/connect
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/{partner_id}/connect", response_model=MessageOut, status_code=201)
async def connect_with_partner(
    partner_id: str,
    data: MessageCreate | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate a connection with a discovered partner
    by sending an introductory message.
    """
    if partner_id == user.id:
        raise IronPulseError("Cannot connect with yourself", status_code=400)

    # Verify partner exists
    partner_q = await db.execute(select(User).where(User.id == partner_id))
    partner = partner_q.scalar_one_or_none()
    if not partner:
        raise NotFoundError("Partner user")

    content = (
        data.content
        if data and data.content
        else f"Hey {partner.display_name}! Let's train together! 💪"
    )
    message_type = data.message_type if data else "text"

    msg = Message(
        sender_id=user.id,
        recipient_id=partner_id,
        content=content,
        message_type=message_type,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(msg)

    # WebSocket event
    await manager.send_to_user(
        partner_id,
        "new_message",
        {
            "message_id": msg.id,
            "sender_id": user.id,
            "sender_username": user.username,
            "sender_display_name": user.display_name,
            "sender_avatar_url": user.avatar_url,
            "content": msg.content,
            "message_type": message_type,
            "created_at": msg.created_at.isoformat(),
        },
    )

    return msg
