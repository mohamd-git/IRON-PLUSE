"""
VIP router — subscription management, VIP Lounge, VIP-only content.

GET   /vip/status      — subscription details or {status: "none"}
POST  /vip/subscribe   — initiate payment for VIP plan
POST  /vip/cancel      — cancel (set auto_renew=False)
GET   /vip/lounge      — last 100 lounge messages (VIP only)
POST  /vip/lounge      — post to lounge + WS broadcast (VIP only)
GET   /vip/content      — VIP-only workout templates (VIP only)
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import IronPulseError, NotFoundError
from app.core.websocket import manager
from app.database import get_db
from app.dependencies import get_current_user, require_vip
from app.models.user import User
from app.models.vip import VIPLoungeMessage, VIPSubscription, VIPStatus
from app.models.workout import WorkoutTemplate
from app.schemas.payment import (
    PaymentInitiateResponse,
    VipCancelResponse,
    VipStatusOut,
    VipSubscribeRequest,
)
from app.schemas.workout import TemplateOut
from app.services import payment_service

router = APIRouter(prefix="/vip", tags=["VIP"])


# ── Lounge schemas ────────────────────────────────────
class LoungeMessageCreate(BaseModel):
    content: str
    message_type: str = "text"


class LoungeMessageOut(BaseModel):
    id: str
    user_id: str
    username: str
    display_name: str
    avatar_url: str | None = None
    content: str
    message_type: str
    is_pinned: bool
    created_at: str


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /vip/status
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/status", response_model=VipStatusOut)
async def vip_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the user's VIP subscription details, or {status: 'none'}."""
    result = await db.execute(
        select(VIPSubscription).where(VIPSubscription.user_id == user.id)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        return VipStatusOut(status="none")

    return VipStatusOut(
        status=sub.status.value if hasattr(sub.status, "value") else sub.status,
        plan=sub.plan.value if hasattr(sub.plan, "value") else sub.plan,
        started_at=sub.started_at,
        expires_at=sub.expires_at,
        auto_renew=sub.auto_renew,
        price_myr=sub.price_myr,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /vip/subscribe
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/subscribe", response_model=PaymentInitiateResponse)
async def subscribe(
    data: VipSubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate a VIP subscription payment.
    Routes to Billplz (default) or ToyyibPay based on payment_method.
    TNG/Boost → ToyyibPay; FPX/Card → Billplz.
    """
    # Route to the appropriate gateway
    if data.payment_method in ("tng", "boost"):
        result = await payment_service.initiate_toyyibpay(
            user_id=user.id,
            plan=data.plan,
            payment_method=data.payment_method,
            return_url=data.return_url,
            db=db,
        )
    else:
        result = await payment_service.initiate_billplz(
            user_id=user.id,
            plan=data.plan,
            payment_method=data.payment_method,
            return_url=data.return_url,
            db=db,
        )

    return PaymentInitiateResponse(**result)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /vip/cancel
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/cancel", response_model=VipCancelResponse)
async def cancel_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel VIP subscription: set auto_renew=False, status='cancelled'.
    The subscription remains active until expires_at.
    """
    result = await db.execute(
        select(VIPSubscription).where(VIPSubscription.user_id == user.id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise NotFoundError("VIP subscription")
    if sub.status not in (VIPStatus.active, VIPStatus.trial):
        raise IronPulseError(
            f"Subscription is already {sub.status.value}", status_code=400
        )

    sub.auto_renew = False
    sub.status = VIPStatus.cancelled
    await db.flush()

    return VipCancelResponse(
        message="Subscription cancelled. VIP access remains until expiry.",
        status="cancelled",
        auto_renew=False,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /vip/lounge
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/lounge", response_model=list[LoungeMessageOut])
async def get_lounge(
    user: User = Depends(require_vip),
    db: AsyncSession = Depends(get_db),
):
    """Return the last 100 VIP Lounge messages with user avatars."""
    result = await db.execute(
        select(VIPLoungeMessage)
        .order_by(VIPLoungeMessage.created_at.desc())
        .limit(100)
    )
    messages = list(result.scalars().all())

    out: list[LoungeMessageOut] = []
    for msg in messages:
        author_q = await db.execute(select(User).where(User.id == msg.user_id))
        author = author_q.scalar_one_or_none()
        out.append(
            LoungeMessageOut(
                id=msg.id,
                user_id=msg.user_id,
                username=author.username if author else "unknown",
                display_name=author.display_name if author else "Unknown",
                avatar_url=author.avatar_url if author else None,
                content=msg.content,
                message_type=msg.message_type,
                is_pinned=msg.is_pinned,
                created_at=msg.created_at.isoformat(),
            )
        )
    return out


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /vip/lounge
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/lounge", response_model=LoungeMessageOut, status_code=201)
async def post_to_lounge(
    data: LoungeMessageCreate,
    user: User = Depends(require_vip),
    db: AsyncSession = Depends(get_db),
):
    """Post a message to the VIP Lounge and broadcast via WebSocket."""
    msg = VIPLoungeMessage(
        user_id=user.id,
        content=data.content,
        message_type=data.message_type,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(msg)

    lounge_msg = LoungeMessageOut(
        id=msg.id,
        user_id=user.id,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        content=msg.content,
        message_type=msg.message_type,
        is_pinned=msg.is_pinned,
        created_at=msg.created_at.isoformat(),
    )

    # Broadcast to all connected users
    await manager.broadcast(
        "lounge_message",
        lounge_msg.model_dump(),
    )

    return lounge_msg


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /vip/content
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/content", response_model=list[TemplateOut])
async def vip_content(
    user: User = Depends(require_vip),
    db: AsyncSession = Depends(get_db),
):
    """Return all VIP-only workout templates."""
    result = await db.execute(
        select(WorkoutTemplate).where(WorkoutTemplate.is_vip_only.is_(True))
    )
    return list(result.scalars().all())
