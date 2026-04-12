"""
Battle Challenges router.

POST /challenges                   — create + WS event
GET  /challenges                   — sent + received
POST /challenges/{id}/accept       — accept + notify challenger
POST /challenges/{id}/decline      — decline
"""

import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, IronPulseError, NotFoundError
from app.core.websocket import manager
from app.database import get_db
from app.dependencies import get_current_user
from app.models.community import (
    BattleChallenge,
    ChallengeStatus,
    Notification,
    NotificationType,
)
from app.models.user import User
from app.schemas.community import ChallengeCreate, ChallengeOut

router = APIRouter(prefix="/challenges", tags=["Challenges"])


# ── POST /challenges ─────────────────────────────────
@router.post("/", response_model=ChallengeOut, status_code=201)
async def create_challenge(
    data: ChallengeCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a battle challenge and send WebSocket event to the challenged user."""
    if data.challenged_id == user.id:
        raise IronPulseError("Cannot challenge yourself", status_code=400)

    # Verify challenged user exists
    target_result = await db.execute(
        select(User).where(User.id == data.challenged_id)
    )
    target = target_result.scalar_one_or_none()
    if not target:
        raise NotFoundError("Challenged user")

    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = now + datetime.timedelta(hours=data.expires_hours)

    challenge = BattleChallenge(
        challenger_id=user.id,
        challenged_id=data.challenged_id,
        exercise_id=data.exercise_id,
        target_weight_kg=data.target_weight_kg,
        target_reps=data.target_reps,
        status=ChallengeStatus.pending,
        expires_at=expires_at,
    )
    db.add(challenge)

    # Notification
    notification = Notification(
        user_id=data.challenged_id,
        notification_type=NotificationType.challenge,
        title="Battle Challenge! ⚔️",
        body=f"{user.display_name} challenged you!",
        metadata_json={
            "challenge_id": "",  # will update after flush
            "challenger_id": user.id,
            "challenger_username": user.username,
            "exercise_id": data.exercise_id,
        },
    )
    db.add(notification)
    await db.flush()
    await db.refresh(challenge)

    # Update notification metadata with challenge id
    notification.metadata_json["challenge_id"] = challenge.id

    # WebSocket event
    await manager.send_to_user(
        data.challenged_id,
        "challenge_received",
        {
            "challenge_id": challenge.id,
            "challenger_id": user.id,
            "challenger_username": user.username,
            "challenger_display_name": user.display_name,
            "exercise_id": data.exercise_id,
            "target_weight_kg": data.target_weight_kg,
            "target_reps": data.target_reps,
            "expires_at": expires_at.isoformat(),
        },
    )

    return challenge


# ── GET /challenges ──────────────────────────────────
@router.get("/", response_model=list[ChallengeOut])
async def list_challenges(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all challenges where the current user is challenger or challenged."""
    result = await db.execute(
        select(BattleChallenge)
        .where(
            or_(
                BattleChallenge.challenger_id == user.id,
                BattleChallenge.challenged_id == user.id,
            )
        )
        .order_by(BattleChallenge.created_at.desc())
    )
    return list(result.scalars().all())


# ── POST /challenges/{id}/accept ─────────────────────
@router.post("/{challenge_id}/accept", response_model=ChallengeOut)
async def accept_challenge(
    challenge_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BattleChallenge).where(BattleChallenge.id == challenge_id)
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise NotFoundError("Challenge")
    if challenge.challenged_id != user.id:
        raise ForbiddenError("Only the challenged user can accept")
    if challenge.status != ChallengeStatus.pending:
        raise IronPulseError(
            f"Challenge is already {challenge.status.value}", status_code=400
        )

    challenge.status = ChallengeStatus.accepted
    await db.flush()

    # Notify challenger
    notification = Notification(
        user_id=challenge.challenger_id,
        notification_type=NotificationType.challenge,
        title="Challenge Accepted! 💪",
        body=f"{user.display_name} accepted your challenge!",
        metadata_json={"challenge_id": challenge.id},
    )
    db.add(notification)
    await db.flush()

    await manager.send_to_user(
        challenge.challenger_id,
        "challenge_received",
        {
            "challenge_id": challenge.id,
            "status": "accepted",
            "accepted_by": user.username,
        },
    )

    return challenge


# ── POST /challenges/{id}/decline ────────────────────
@router.post("/{challenge_id}/decline", response_model=ChallengeOut)
async def decline_challenge(
    challenge_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BattleChallenge).where(BattleChallenge.id == challenge_id)
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise NotFoundError("Challenge")
    if challenge.challenged_id != user.id:
        raise ForbiddenError("Only the challenged user can decline")
    if challenge.status != ChallengeStatus.pending:
        raise IronPulseError(
            f"Challenge is already {challenge.status.value}", status_code=400
        )

    challenge.status = ChallengeStatus.declined
    await db.flush()
    return challenge
