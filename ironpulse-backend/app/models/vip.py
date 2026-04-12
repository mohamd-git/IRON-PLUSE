"""
VIP models — VIPSubscription, VIPLoungeMessage.
All IDs are UUID strings.  Async-compatible via app.database.Base.
"""

import enum
import uuid
import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, String, Text, ForeignKey, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ── Enums ─────────────────────────────────────────────
class VIPPlan(str, enum.Enum):
    monthly = "monthly"
    annual = "annual"


class VIPStatus(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"
    expired = "expired"
    trial = "trial"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  VIPSubscription  (one-to-one with User)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class VIPSubscription(Base):
    __tablename__ = "vip_subscriptions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), unique=True, nullable=False
    )
    plan: Mapped[VIPPlan] = mapped_column(
        Enum(VIPPlan, name="vip_plan", native_enum=False), nullable=False
    )
    status: Mapped[VIPStatus] = mapped_column(
        Enum(VIPStatus, name="vip_status", native_enum=False),
        default=VIPStatus.active,
    )
    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    expires_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    price_myr: Mapped[float] = mapped_column(Float, nullable=False)
    payment_method: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────
    user = relationship("User", back_populates="vip_subscription")

    def __repr__(self) -> str:
        return f"<VIPSubscription {self.plan.value} ({self.status.value})>"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  VIPLoungeMessage  (VIP-only chat room)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class VIPLoungeMessage(Base):
    __tablename__ = "vip_lounge_messages"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(
        String(30), default="text"
    )
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<VIPLoungeMessage {self.id[:8]}>"
