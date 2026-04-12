"""
Payments router — gateway initiation, webhook callbacks,
history, and payment verification.

POST /payments/initiate      — route to billplz or toyyibpay
POST /payments/callback      — handle gateway webhooks (signature verified)
GET  /payments/history       — user's payment records
POST /payments/verify/{id}   — poll payment status after redirect
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentOut,
    PaymentVerifyOut,
)
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["Payments"])


# ── POST /payments/initiate ──────────────────────────
@router.post("/initiate", response_model=PaymentInitiateResponse)
async def initiate_payment(
    data: PaymentInitiateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate a payment via the specified gateway.
    - tng / boost → ToyyibPay
    - fpx / card  → Billplz (default)
    SST (6%) is added automatically.
    """
    if data.gateway == "toyyibpay" or data.payment_method in ("tng", "boost"):
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


# ── POST /payments/callback ──────────────────────────
@router.post("/callback")
async def payment_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Unified webhook handler for Billplz and ToyyibPay.
    - Billplz sends X-Signature header (HMAC-SHA256 verified)
    - ToyyibPay sends reference via billExternalReferenceNo
    """
    body = await request.form()
    payload = dict(body)

    # Detect gateway by payload shape
    x_signature = request.headers.get("X-Signature") or request.headers.get(
        "x-signature"
    )

    if "id" in payload and ("paid" in payload or "paid_amount" in payload):
        # Billplz callback
        await payment_service.handle_billplz_callback(
            payload, x_signature, db
        )
    elif (
        "billExternalReferenceNo" in payload
        or "refno" in payload
        or "status_id" in payload
    ):
        # ToyyibPay callback
        await payment_service.handle_toyyibpay_callback(payload, db)
    else:
        # Try both — Billplz first
        if x_signature:
            await payment_service.handle_billplz_callback(
                payload, x_signature, db
            )
        else:
            await payment_service.handle_toyyibpay_callback(payload, db)

    return {"status": "ok"}


# ── GET /payments/history ────────────────────────────
@router.get("/history", response_model=list[PaymentOut])
async def payment_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current user's payment records."""
    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == user.id)
        .order_by(Payment.created_at.desc())
    )
    return list(result.scalars().all())


# ── POST /payments/verify/{id} ───────────────────────
@router.post("/verify/{payment_id}", response_model=PaymentVerifyOut)
async def verify_payment(
    payment_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Poll a payment's status.
    Used after the user is redirected back via return_url.
    """
    result = await payment_service.verify_payment(
        payment_id, user.id, db
    )
    return PaymentVerifyOut(**result)
