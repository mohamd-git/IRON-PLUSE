"""
Messaging router — DMs with WebSocket delivery.

GET  /messages/conversations       — grouped convos + last msg + unread
GET  /messages/{user_id}           — full history, paginated
POST /messages/{user_id}           — send + WS "new_message"
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.websocket import manager
from app.database import get_db
from app.dependencies import get_current_user
from app.models.community import Message, MessageType
from app.models.user import User
from app.schemas.community import (
    ConversationOut,
    MessageCreate,
    MessageOut,
)

router = APIRouter(prefix="/messages", tags=["Messages"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /messages/conversations
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Group messages by conversation partner.
    Returns last message + unread count per conversation.
    """
    # Get all unique conversation partners
    partner_ids_q = await db.execute(
        select(
            case(
                (Message.sender_id == user.id, Message.recipient_id),
                else_=Message.sender_id,
            ).label("partner_id")
        )
        .where(
            or_(
                Message.sender_id == user.id,
                Message.recipient_id == user.id,
            )
        )
        .distinct()
    )
    partner_ids = [row[0] for row in partner_ids_q.all()]

    conversations: list[ConversationOut] = []
    for pid in partner_ids:
        # Last message in conversation
        last_msg_q = await db.execute(
            select(Message)
            .where(
                or_(
                    and_(
                        Message.sender_id == user.id,
                        Message.recipient_id == pid,
                    ),
                    and_(
                        Message.sender_id == pid,
                        Message.recipient_id == user.id,
                    ),
                )
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_q.scalar_one_or_none()
        if not last_msg:
            continue

        # Unread count (messages FROM partner that I haven't read)
        unread_q = await db.execute(
            select(func.count()).where(
                and_(
                    Message.sender_id == pid,
                    Message.recipient_id == user.id,
                    Message.is_read.is_(False),
                )
            )
        )
        unread = unread_q.scalar() or 0

        # Partner info
        partner_q = await db.execute(select(User).where(User.id == pid))
        partner = partner_q.scalar_one_or_none()
        if not partner:
            continue

        conversations.append(
            ConversationOut(
                partner_id=pid,
                partner_username=partner.username,
                partner_display_name=partner.display_name,
                partner_avatar_url=partner.avatar_url,
                last_message=MessageOut.model_validate(last_msg),
                unread_count=unread,
            )
        )

    # Sort by most recent message first
    conversations.sort(
        key=lambda c: c.last_message.created_at, reverse=True
    )
    return conversations


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /messages/{user_id} — full history
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/{partner_id}", response_model=list[MessageOut])
async def get_message_history(
    partner_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Full message history with a user, most recent first."""
    result = await db.execute(
        select(Message)
        .where(
            or_(
                and_(
                    Message.sender_id == user.id,
                    Message.recipient_id == partner_id,
                ),
                and_(
                    Message.sender_id == partner_id,
                    Message.recipient_id == user.id,
                ),
            )
        )
        .order_by(Message.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    messages = list(result.scalars().all())

    # Mark incoming messages as read
    for msg in messages:
        if msg.recipient_id == user.id and not msg.is_read:
            msg.is_read = True
    await db.flush()

    return messages


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /messages/{user_id} — send message
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/{recipient_id}", response_model=MessageOut, status_code=201)
async def send_message(
    recipient_id: str,
    data: MessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a DM and emit 'new_message' via WebSocket."""
    # Verify recipient exists
    recipient_q = await db.execute(
        select(User).where(User.id == recipient_id)
    )
    recipient = recipient_q.scalar_one_or_none()
    if not recipient:
        raise NotFoundError("Recipient user")

    msg = Message(
        sender_id=user.id,
        recipient_id=recipient_id,
        content=data.content,
        message_type=data.message_type,
        metadata_json=data.metadata_json,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(msg)

    # WebSocket event
    await manager.send_to_user(
        recipient_id,
        "new_message",
        {
            "message_id": msg.id,
            "sender_id": user.id,
            "sender_username": user.username,
            "sender_display_name": user.display_name,
            "sender_avatar_url": user.avatar_url,
            "content": msg.content,
            "message_type": msg.message_type
            if isinstance(msg.message_type, str)
            else msg.message_type.value,
            "created_at": msg.created_at.isoformat(),
        },
    )

    return msg
