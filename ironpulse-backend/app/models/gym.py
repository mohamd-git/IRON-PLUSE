"""
Gym, PhysiqueLog, BodyMeasurement models.
All IDs are UUID strings.  Async-compatible via app.database.Base.
"""

import uuid
import datetime

from sqlalchemy import (
    Boolean, DateTime, Float, Integer, JSON, String, Text, ForeignKey, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Gym  (directory of gyms / VIP partner venues)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class Gym(Base):
    __tablename__ = "gyms"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hours: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )  # e.g. {"mon": "06:00-23:00", ...}
    is_24h: Mapped[bool] = mapped_column(Boolean, default=False)
    is_vip_partner: Mapped[bool] = mapped_column(Boolean, default=False)
    features: Mapped[list | None] = mapped_column(
        JSON, nullable=True
    )  # ["sauna", "pool", ...]
    photo_urls: Mapped[list | None] = mapped_column(JSON, nullable=True)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<Gym {self.name}>"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  PhysiqueLog  (progress photos + body composition)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class PhysiqueLog(Base):
    __tablename__ = "physique_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    body_fat_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    logged_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────
    user = relationship("User", back_populates="physique_logs")

    def __repr__(self) -> str:
        return f"<PhysiqueLog {self.id[:8]} {self.weight_kg}kg>"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  BodyMeasurement  (tape measurements over time)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class BodyMeasurement(Base):
    __tablename__ = "body_measurements"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    chest_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    waist_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    hips_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    arms_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    quads_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    calves_cm: Mapped[float | None] = mapped_column(Float, nullable=True)

    logged_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────
    user = relationship("User", back_populates="measurements")

    def __repr__(self) -> str:
        return f"<BodyMeasurement {self.id[:8]}>"
