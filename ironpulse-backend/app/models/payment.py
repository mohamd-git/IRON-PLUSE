"""
Payment model — tracks all financial transactions.
All IDs are UUID strings.  Async-compatible via app.database.Base.
"""

import enum
import uuid
import datetime

from sqlalchemy import (
    DateTime, Enum, Float, JSON, String, ForeignKey, func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


# ── Enums ─────────────────────────────────────────────
class PaymentMethod(str, enum.Enum):
    tng = "tng"
    boost = "boost"
    fpx = "fpx"
    card = "card"


class PaymentProvider(str, enum.Enum):
    billplz = "billplz"
    toyyibpay = "toyyibpay"
    stripe = "stripe"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class PaymentPlan(str, enum.Enum):
    monthly = "monthly"
    annual = "annual"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Payment
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    amount_myr: Mapped[float] = mapped_column(Float, nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method", native_enum=False),
        nullable=False,
    )
    provider: Mapped[PaymentProvider] = mapped_column(
        Enum(PaymentProvider, name="payment_provider", native_enum=False),
        nullable=False,
    )
    provider_payment_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status", native_enum=False),
        default=PaymentStatus.pending,
    )
    plan: Mapped[PaymentPlan] = mapped_column(
        Enum(PaymentPlan, name="payment_plan", native_enum=False),
        nullable=False,
    )
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return (
            f"<Payment {self.id[:8]} RM{self.amount_myr} "
            f"{self.provider.value} ({self.status.value})>"
        )
