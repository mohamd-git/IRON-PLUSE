"""
Payment / VIP schemas — updated with SST, initiation, verification.
"""

import datetime
from pydantic import BaseModel


# ── VIP ───────────────────────────────────────────────
class VipStatusOut(BaseModel):
    status: str  # active | cancelled | expired | trial | none
    plan: str | None = None
    started_at: datetime.datetime | None = None
    expires_at: datetime.datetime | None = None
    auto_renew: bool = False
    price_myr: float | None = None


class VipSubscribeRequest(BaseModel):
    plan: str  # monthly | annual
    payment_method: str = "fpx"  # fpx | tng | boost | card
    return_url: str


class VipCancelResponse(BaseModel):
    message: str
    status: str
    auto_renew: bool


# ── Payment initiation ───────────────────────────────
class PaymentInitiateRequest(BaseModel):
    plan: str  # monthly | annual
    payment_method: str = "fpx"  # fpx | tng | boost | card
    return_url: str
    gateway: str = "billplz"  # billplz | toyyibpay


class PaymentInitiateResponse(BaseModel):
    payment_id: str
    payment_url: str
    amount_myr: float
    sst_myr: float
    total_myr: float


# ── Payment record ────────────────────────────────────
class PaymentOut(BaseModel):
    id: str
    user_id: str
    amount_myr: float
    payment_method: str
    provider: str
    provider_payment_id: str | None = None
    status: str
    plan: str
    metadata_json: dict | None = None
    created_at: datetime.datetime
    completed_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


class PaymentVerifyOut(BaseModel):
    payment_id: str
    status: str
    paid: bool
    completed_at: datetime.datetime | None = None
