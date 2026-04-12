"""
Payment service — Billplz v4 & ToyyibPay integration.

Plans:
  monthly = RM 39.00 (30 days)
  annual  = RM 299.00 (365 days)
  SST: 6% added at checkout → total = price × 1.06

Billplz callback verification:
  HMAC-SHA256 of "id|paid_amount|paid_at|paid" signed with API key.
"""

import datetime
import hashlib
import hmac
import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import IronPulseError, NotFoundError, PaymentError
from app.models.community import Notification, NotificationType
from app.models.payment import (
    Payment,
    PaymentMethod,
    PaymentPlan,
    PaymentProvider,
    PaymentStatus,
)
from app.models.user import User, UserRole
from app.models.vip import VIPPlan, VIPSubscription, VIPStatus

logger = logging.getLogger("ironpulse.payments")

# ── Plan pricing ──────────────────────────────────────
VIP_PRICES = {
    "monthly": 39.00,
    "annual": 299.00,
}

VIP_DAYS = {
    "monthly": 30,
    "annual": 365,
}

SST_RATE = 0.06  # 6%


def _calculate_total(plan: str) -> tuple[float, float, float]:
    """Return (base_price, sst, total) in MYR."""
    base = VIP_PRICES.get(plan)
    if not base:
        raise PaymentError(f"Unknown plan: {plan}")
    sst = round(base * SST_RATE, 2)
    total = round(base + sst, 2)
    return base, sst, total


def _parse_plan(plan_str: str) -> PaymentPlan:
    return PaymentPlan.annual if plan_str == "annual" else PaymentPlan.monthly


def _parse_method(method_str: str) -> PaymentMethod:
    mapping = {
        "tng": PaymentMethod.tng,
        "boost": PaymentMethod.boost,
        "fpx": PaymentMethod.fpx,
        "card": PaymentMethod.card,
    }
    return mapping.get(method_str, PaymentMethod.fpx)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Billplz  (v4)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def initiate_billplz(
    user_id: str,
    plan: str,
    payment_method: str,
    return_url: str,
    db: AsyncSession,
) -> dict:
    """
    POST to Billplz v4 API, create a pending Payment record,
    return {payment_url, payment_id, amount_myr, sst_myr, total_myr}.
    """
    base, sst, total = _calculate_total(plan)

    # Fetch user for email + name
    user_q = await db.execute(select(User).where(User.id == user_id))
    user = user_q.scalar_one_or_none()
    if not user:
        raise NotFoundError("User")

    # Create pending payment
    payment = Payment(
        user_id=user_id,
        amount_myr=total,
        payment_method=_parse_method(payment_method),
        provider=PaymentProvider.billplz,
        plan=_parse_plan(plan),
        status=PaymentStatus.pending,
        metadata_json={
            "base_myr": base,
            "sst_myr": sst,
            "total_myr": total,
            "sst_rate": SST_RATE,
        },
    )
    db.add(payment)
    await db.flush()
    await db.refresh(payment)

    # Call Billplz v4
    amount_sen = int(total * 100)
    callback_url = f"{settings.API_URL}/api/v1/payments/callback"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://www.billplz.com/api/v4/bills",
            auth=(settings.BILLPLZ_API_KEY, ""),
            json={
                "collection_id": settings.BILLPLZ_COLLECTION_ID,
                "email": user.email,
                "name": user.display_name,
                "amount": amount_sen,
                "callback_url": callback_url,
                "redirect_url": return_url,
                "description": f"IRON PULSE VIP — {plan} (incl. 6% SST)",
                "reference_1": payment.id,
                "reference_1_label": "payment_id",
            },
        )

    if resp.status_code not in (200, 201):
        logger.error("Billplz error %d: %s", resp.status_code, resp.text)
        payment.status = PaymentStatus.failed
        await db.flush()
        raise PaymentError("Failed to create Billplz bill")

    bill = resp.json()
    payment.provider_payment_id = bill["id"]
    await db.flush()

    return {
        "payment_id": payment.id,
        "payment_url": bill["url"],
        "amount_myr": base,
        "sst_myr": sst,
        "total_myr": total,
    }


def verify_billplz_signature(payload: dict, x_signature: str) -> bool:
    """
    Verify Billplz X-Signature header.
    Message = "id|paid_amount|paid_at|paid"
    Signature = HMAC-SHA256(message, API_KEY)
    """
    msg = "|".join(
        str(payload.get(k, ""))
        for k in ["id", "paid_amount", "paid_at", "paid"]
    )
    expected = hmac.new(
        settings.BILLPLZ_API_KEY.encode(),
        msg.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, x_signature)


async def handle_billplz_callback(
    payload: dict, x_signature: str | None, db: AsyncSession
) -> None:
    """
    Process Billplz callback:
    1. Verify HMAC-SHA256 X-Signature
    2. If paid=true → complete payment → activate VIP → notify
    """
    # Verify signature
    if x_signature and not verify_billplz_signature(payload, x_signature):
        logger.warning("Invalid Billplz signature")
        raise PaymentError("Invalid payment signature")

    bill_id = payload.get("id")
    paid = payload.get("paid")

    result = await db.execute(
        select(Payment).where(Payment.provider_payment_id == bill_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        logger.warning("Billplz callback: no payment for bill %s", bill_id)
        return

    payment.metadata_json = {**(payment.metadata_json or {}), **payload}

    if paid and str(paid).lower() == "true":
        payment.status = PaymentStatus.completed
        payment.completed_at = datetime.datetime.now(datetime.timezone.utc)
        await _activate_vip(payment, db)
    else:
        payment.status = PaymentStatus.failed

    await db.flush()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ToyyibPay  (TNG / Boost eWallet)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def initiate_toyyibpay(
    user_id: str,
    plan: str,
    payment_method: str,
    return_url: str,
    db: AsyncSession,
) -> dict:
    """
    Create a ToyyibPay bill — commonly used for Touch'n Go
    and Boost eWallet payments.
    """
    base, sst, total = _calculate_total(plan)

    user_q = await db.execute(select(User).where(User.id == user_id))
    user = user_q.scalar_one_or_none()
    if not user:
        raise NotFoundError("User")

    payment = Payment(
        user_id=user_id,
        amount_myr=total,
        payment_method=_parse_method(payment_method),
        provider=PaymentProvider.toyyibpay,
        plan=_parse_plan(plan),
        status=PaymentStatus.pending,
        metadata_json={
            "base_myr": base,
            "sst_myr": sst,
            "total_myr": total,
        },
    )
    db.add(payment)
    await db.flush()
    await db.refresh(payment)

    callback_url = f"{settings.API_URL}/api/v1/payments/callback"
    amount_sen = int(total * 100)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://toyyibpay.com/index.php/api/createBill",
            data={
                "userSecretKey": settings.TOYYIBPAY_USER_SECRET_KEY,
                "categoryCode": settings.TOYYIBPAY_CATEGORY_CODE,
                "billName": f"IRON PULSE VIP {plan}",
                "billDescription": f"IRON PULSE VIP — {plan} (incl. 6% SST)",
                "billPriceSetting": 1,
                "billPayorInfo": 1,
                "billAmount": amount_sen,
                "billReturnUrl": return_url,
                "billCallbackUrl": callback_url,
                "billExternalReferenceNo": payment.id,
                "billTo": user.display_name,
                "billEmail": user.email,
                "billPhone": "",
            },
        )

    if resp.status_code != 200:
        logger.error("ToyyibPay error %d: %s", resp.status_code, resp.text)
        payment.status = PaymentStatus.failed
        await db.flush()
        raise PaymentError("Failed to create ToyyibPay bill")

    data = resp.json()
    if isinstance(data, list) and len(data) > 0:
        bill_code = data[0].get("BillCode", "")
    else:
        raise PaymentError("Unexpected ToyyibPay response")

    payment.provider_payment_id = bill_code
    await db.flush()

    return {
        "payment_id": payment.id,
        "payment_url": f"https://toyyibpay.com/{bill_code}",
        "amount_myr": base,
        "sst_myr": sst,
        "total_myr": total,
    }


async def handle_toyyibpay_callback(
    payload: dict, db: AsyncSession
) -> None:
    """Process ToyyibPay callback and activate VIP if paid."""
    ref = payload.get("billExternalReferenceNo") or payload.get("refno")
    status_id = payload.get("status_id")

    if not ref:
        return

    result = await db.execute(select(Payment).where(Payment.id == ref))
    payment = result.scalar_one_or_none()
    if not payment:
        return

    payment.metadata_json = {**(payment.metadata_json or {}), **payload}

    if str(status_id) == "1":
        payment.status = PaymentStatus.completed
        payment.completed_at = datetime.datetime.now(datetime.timezone.utc)
        await _activate_vip(payment, db)
    else:
        payment.status = PaymentStatus.failed

    await db.flush()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  VIP activation
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def _activate_vip(payment: Payment, db: AsyncSession) -> None:
    """
    Create/update VIP subscription and set user role to VIP.
    Sends a notification to the user.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    plan_str = payment.plan.value if hasattr(payment.plan, "value") else payment.plan
    plan = VIPPlan.annual if plan_str == "annual" else VIPPlan.monthly
    days = VIP_DAYS.get(plan_str, 30)
    expires = now + datetime.timedelta(days=days)

    # Upsert (one-to-one)
    existing_q = await db.execute(
        select(VIPSubscription).where(VIPSubscription.user_id == payment.user_id)
    )
    existing = existing_q.scalar_one_or_none()

    if existing:
        # If still active, extend from current expiry
        if existing.status == VIPStatus.active and existing.expires_at > now:
            expires = existing.expires_at + datetime.timedelta(days=days)
        existing.plan = plan
        existing.status = VIPStatus.active
        existing.started_at = now
        existing.expires_at = expires
        existing.price_myr = payment.amount_myr
        existing.auto_renew = True
    else:
        sub = VIPSubscription(
            user_id=payment.user_id,
            plan=plan,
            status=VIPStatus.active,
            started_at=now,
            expires_at=expires,
            price_myr=payment.amount_myr,
            auto_renew=True,
        )
        db.add(sub)

    # Set user role
    user_q = await db.execute(
        select(User).where(User.id == payment.user_id)
    )
    user = user_q.scalar_one_or_none()
    if user and user.role == UserRole.user:
        user.role = UserRole.vip

    # Send notification
    notification = Notification(
        user_id=payment.user_id,
        notification_type=NotificationType.system,
        title="VIP Activated! 🏆",
        body=f"Welcome to IRON PULSE VIP ({plan_str}). Your premium features are now active until {expires.strftime('%d %b %Y')}.",
        metadata_json={
            "plan": plan_str,
            "expires_at": expires.isoformat(),
            "payment_id": payment.id,
        },
    )
    db.add(notification)
    await db.flush()

    logger.info(
        "VIP activated: user=%s plan=%s expires=%s",
        payment.user_id,
        plan_str,
        expires.isoformat(),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Payment verification (poll status)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def verify_payment(
    payment_id: str, user_id: str, db: AsyncSession
) -> dict:
    """Check current payment status — used after return_url redirect."""
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise NotFoundError("Payment")
    if payment.user_id != user_id:
        raise IronPulseError("Payment not found", status_code=404)

    return {
        "payment_id": payment.id,
        "status": payment.status.value
        if hasattr(payment.status, "value")
        else payment.status,
        "paid": payment.status == PaymentStatus.completed,
        "completed_at": payment.completed_at,
    }
