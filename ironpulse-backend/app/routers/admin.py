"""
Admin router — user management, platform analytics, revenue,
and activity feed.  All endpoints require admin role.

GET   /admin/users                    — paginated, search, filter
PATCH /admin/users/{id}               — update role, is_active
GET   /admin/analytics                — platform KPIs + MRR/ARR
GET   /admin/revenue                  — revenue breakdown
GET   /admin/activity-feed            — last 50 notifications
"""

import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import and_, case, extract, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import IronPulseError, NotFoundError
from app.database import get_db
from app.dependencies import require_admin
from app.models.community import Notification
from app.models.payment import Payment, PaymentStatus
from app.models.user import User, UserRole
from app.models.vip import VIPSubscription, VIPStatus
from app.models.workout import PersonalRecord, WorkoutSession
from app.schemas.community import NotificationOut
from app.schemas.user import UserOut

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Request / Response schemas ────────────────────────
class BootstrapRequest(BaseModel):
    email: str
    secret: str


class AdminUserUpdate(BaseModel):
    role: str | None = None  # user | vip | admin
    is_active: bool | None = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /admin/bootstrap  — promote first owner to admin
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/bootstrap")
async def bootstrap_admin(
    data: BootstrapRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    One-shot endpoint to promote an account to admin using the ADMIN_SECRET
    env var.  No authentication required — the secret IS the auth.
    Set a strong ADMIN_SECRET in .env and keep it private.
    """
    if not settings.ADMIN_SECRET or data.secret != settings.ADMIN_SECRET:
        raise IronPulseError("Invalid secret.", status_code=403)

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User")

    user.role = UserRole.admin
    await db.flush()
    return {"message": f"{user.email} is now admin.", "role": user.role.value}


class PlatformAnalytics(BaseModel):
    total_users: int
    active_this_week: int
    vip_count: int
    total_sessions: int
    sessions_this_week: int
    total_volume_kg: float
    prs_this_week: int
    mrr_myr: float  # Monthly Recurring Revenue
    arr_myr: float  # Annual Recurring Revenue


class RevenueByPlan(BaseModel):
    plan: str
    count: int
    total_myr: float


class RevenueByMethod(BaseModel):
    payment_method: str
    count: int
    total_myr: float


class MonthlyRevenue(BaseModel):
    month: str  # "2026-04"
    total_myr: float
    count: int


class RevenueBreakdown(BaseModel):
    by_plan: list[RevenueByPlan]
    by_method: list[RevenueByMethod]
    by_month: list[MonthlyRevenue]  # last 12 months


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /admin/users
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/users", response_model=list[UserOut])
async def list_users(
    search: str | None = Query(None, description="Search username or email"),
    role: str | None = Query(None, description="Filter by role: user/vip/admin"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Paginated user list with search and filters."""
    query = select(User)

    if search:
        query = query.where(
            or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )
    if role:
        try:
            role_enum = UserRole(role)
            query = query.where(User.role == role_enum)
        except ValueError:
            pass
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  PATCH /admin/users/{id}
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    data: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's role and/or active status (suspend/activate)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User")

    if data.role is not None:
        try:
            user.role = UserRole(data.role)
        except ValueError:
            raise IronPulseError(
                f"Invalid role: {data.role}. Must be user, vip, or admin",
                status_code=400,
            )

    if data.is_active is not None:
        user.is_active = data.is_active

    await db.flush()
    return {
        "user_id": user.id,
        "role": user.role.value,
        "is_active": user.is_active,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /admin/analytics
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/analytics", response_model=PlatformAnalytics)
async def platform_analytics(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Platform KPIs:
    - MRR = active monthly subs × RM 39 + active annual subs × (RM 299/12)
    - ARR = MRR × 12
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    week_ago = now - datetime.timedelta(days=7)

    # Total users
    total_users = (
        await db.execute(select(func.count()).select_from(User))
    ).scalar() or 0

    # Active this week (has a workout in the last 7 days)
    active_this_week = (
        await db.execute(
            select(func.count()).where(
                User.last_workout_date >= week_ago.date()
            )
        )
    ).scalar() or 0

    # VIP count
    vip_count = (
        await db.execute(
            select(func.count()).where(User.role == UserRole.vip)
        )
    ).scalar() or 0

    # Total sessions
    total_sessions = (
        await db.execute(
            select(func.count()).select_from(WorkoutSession)
        )
    ).scalar() or 0

    # Sessions this week
    sessions_this_week = (
        await db.execute(
            select(func.count()).where(
                WorkoutSession.started_at >= week_ago
            )
        )
    ).scalar() or 0

    # Total volume
    total_volume = (
        await db.execute(
            select(func.coalesce(func.sum(WorkoutSession.total_volume_kg), 0))
        )
    ).scalar() or 0

    # PRs this week
    prs_this_week = (
        await db.execute(
            select(func.count()).where(
                PersonalRecord.achieved_at >= week_ago
            )
        )
    ).scalar() or 0

    # MRR calculation
    # Active monthly subs
    monthly_count = (
        await db.execute(
            select(func.count()).where(
                and_(
                    VIPSubscription.status == VIPStatus.active,
                    VIPSubscription.plan == "monthly",
                )
            )
        )
    ).scalar() or 0

    # Active annual subs
    annual_count = (
        await db.execute(
            select(func.count()).where(
                and_(
                    VIPSubscription.status == VIPStatus.active,
                    VIPSubscription.plan == "annual",
                )
            )
        )
    ).scalar() or 0

    mrr = (monthly_count * 39.00) + (annual_count * (299.00 / 12))
    arr = mrr * 12

    return PlatformAnalytics(
        total_users=total_users,
        active_this_week=active_this_week,
        vip_count=vip_count,
        total_sessions=total_sessions,
        sessions_this_week=sessions_this_week,
        total_volume_kg=float(total_volume),
        prs_this_week=prs_this_week,
        mrr_myr=round(mrr, 2),
        arr_myr=round(arr, 2),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /admin/revenue
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/revenue", response_model=RevenueBreakdown)
async def revenue_breakdown(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Revenue breakdown:
    - By plan (monthly / annual)
    - By payment method (fpx / tng / boost / card)
    - By month (last 12 months)
    """
    completed = Payment.status == PaymentStatus.completed

    # ── By plan ───────────────────────────────────────
    plan_q = await db.execute(
        select(
            Payment.plan,
            func.count().label("count"),
            func.coalesce(func.sum(Payment.amount_myr), 0).label("total"),
        )
        .where(completed)
        .group_by(Payment.plan)
    )
    by_plan = [
        RevenueByPlan(plan=row[0].value if hasattr(row[0], "value") else str(row[0]), count=row[1], total_myr=float(row[2]))
        for row in plan_q.all()
    ]

    # ── By payment method ─────────────────────────────
    method_q = await db.execute(
        select(
            Payment.payment_method,
            func.count().label("count"),
            func.coalesce(func.sum(Payment.amount_myr), 0).label("total"),
        )
        .where(completed)
        .group_by(Payment.payment_method)
    )
    by_method = [
        RevenueByMethod(
            payment_method=row[0].value if hasattr(row[0], "value") else str(row[0]),
            count=row[1],
            total_myr=float(row[2]),
        )
        for row in method_q.all()
    ]

    # ── By month (last 12) ────────────────────────────
    twelve_months_ago = datetime.datetime.now(
        datetime.timezone.utc
    ) - datetime.timedelta(days=365)

    month_q = await db.execute(
        select(
            func.to_char(Payment.completed_at, "YYYY-MM").label("month"),
            func.coalesce(func.sum(Payment.amount_myr), 0).label("total"),
            func.count().label("count"),
        )
        .where(
            and_(
                completed,
                Payment.completed_at >= twelve_months_ago,
            )
        )
        .group_by(func.to_char(Payment.completed_at, "YYYY-MM"))
        .order_by(func.to_char(Payment.completed_at, "YYYY-MM").desc())
    )
    by_month = [
        MonthlyRevenue(month=row[0], total_myr=float(row[1]), count=row[2])
        for row in month_q.all()
    ]

    return RevenueBreakdown(
        by_plan=by_plan,
        by_method=by_method,
        by_month=by_month,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /admin/activity-feed
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/activity-feed", response_model=list[NotificationOut])
async def activity_feed(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Last 50 notifications across ALL users, ordered by created_at desc.
    Gives admins a live view of platform activity.
    """
    result = await db.execute(
        select(Notification)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())
