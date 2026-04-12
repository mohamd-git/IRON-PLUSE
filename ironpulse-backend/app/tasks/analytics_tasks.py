"""
Celery tasks — analytics & maintenance.
"""

import json
import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger("ironpulse.tasks.analytics")


def _sync_db_url() -> str:
    """Convert async DB URL to sync for use in Celery workers."""
    from app.config import settings
    return (
        settings.DATABASE_URL
        .replace("+asyncpg", "")
        .replace("+aiosqlite", "")
    )


def _get_redis_sync():
    """Return a sync Redis client for Celery workers."""
    from app.config import settings
    import redis as redis_sync
    return redis_sync.from_url(settings.REDIS_URL, decode_responses=True)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  check_expired_vip  (daily beat task)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@celery_app.task(name="app.tasks.analytics_tasks.check_expired_vip")
def check_expired_vip() -> dict:
    """
    Periodic task: scan for VIP subscriptions past their expiry date
    and deactivate them.  Runs via Celery Beat (daily).
    """
    logger.info("Running VIP expiry check…")

    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    engine = create_engine(_sync_db_url())

    import datetime
    from app.models.vip import VIPSubscription, VIPStatus
    from app.models.user import User, UserRole

    now = datetime.datetime.now(datetime.timezone.utc)
    expired_count = 0

    with Session(engine) as session:
        expired_subs = (
            session.query(VIPSubscription)
            .filter(
                VIPSubscription.status == VIPStatus.active,
                VIPSubscription.expires_at < now,
            )
            .all()
        )

        user_ids = set()
        for sub in expired_subs:
            sub.status = VIPStatus.expired
            user_ids.add(sub.user_id)
            expired_count += 1

        for uid in user_ids:
            active_count = (
                session.query(VIPSubscription)
                .filter(
                    VIPSubscription.user_id == uid,
                    VIPSubscription.status == VIPStatus.active,
                )
                .count()
            )
            if active_count == 0:
                user = session.get(User, uid)
                if user and user.role == UserRole.vip:
                    user.role = UserRole.user

        session.commit()

    logger.info("VIP expiry check complete — %d expired", expired_count)
    return {"expired_count": expired_count}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  generate_session_analytics
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@celery_app.task(name="app.tasks.analytics_tasks.generate_session_analytics")
def generate_session_analytics(session_id: str) -> dict:
    """
    Triggered when a session is completed.
    Computes aggregates and caches the result in Redis.
    """
    logger.info("Generating analytics for session %s …", session_id)

    from sqlalchemy import create_engine, func
    from sqlalchemy.orm import Session
    from app.models.workout import WorkoutSession, WorkoutSet

    engine = create_engine(_sync_db_url())

    with Session(engine) as db:
        session = db.get(WorkoutSession, session_id)
        if not session:
            logger.warning("Session %s not found", session_id)
            return {"error": "session_not_found"}

        total_sets = (
            db.query(func.count(WorkoutSet.id))
            .filter(WorkoutSet.session_id == session_id)
            .scalar() or 0
        )
        total_reps = (
            db.query(func.coalesce(func.sum(WorkoutSet.reps), 0))
            .filter(WorkoutSet.session_id == session_id)
            .scalar() or 0
        )
        pr_count = (
            db.query(func.count(WorkoutSet.id))
            .filter(
                WorkoutSet.session_id == session_id,
                WorkoutSet.is_pr.is_(True),
            )
            .scalar() or 0
        )
        unique_exercises = (
            db.query(func.count(func.distinct(WorkoutSet.exercise_id)))
            .filter(WorkoutSet.session_id == session_id)
            .scalar() or 0
        )

        analytics = {
            "session_id": session_id,
            "user_id": session.user_id,
            "total_sets": total_sets,
            "total_reps": total_reps,
            "pr_count": pr_count,
            "unique_exercises": unique_exercises,
            "total_volume_kg": float(session.total_volume_kg or 0),
            "duration_seconds": session.duration_seconds or 0,
        }

    # Cache to Redis for 7 days so the dashboard can read it
    try:
        r = _get_redis_sync()
        r.set(
            f"analytics:session:{session_id}",
            json.dumps(analytics),
            ex=604800,  # 7 days
        )
        logger.info("Session analytics cached → %s", session_id)
    except Exception as exc:
        logger.warning("Could not cache analytics to Redis: %s", exc)

    return analytics


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  compute_leaderboard  (daily beat task)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@celery_app.task(name="app.tasks.analytics_tasks.compute_leaderboard")
def compute_leaderboard() -> dict:
    """
    Compute weekly leaderboard (top 20 by volume) and cache in Redis for 24 h.
    """
    logger.info("Computing leaderboard…")

    import datetime
    from sqlalchemy import create_engine, func
    from sqlalchemy.orm import Session
    from app.models.workout import WorkoutSession, WorkoutSet
    from app.models.user import User

    engine = create_engine(_sync_db_url())
    week_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)

    with Session(engine) as db:
        rows = (
            db.query(
                WorkoutSession.user_id,
                func.sum(WorkoutSession.total_volume_kg).label("weekly_volume"),
                func.count(WorkoutSession.id).label("session_count"),
            )
            .filter(WorkoutSession.completed_at >= week_ago)
            .group_by(WorkoutSession.user_id)
            .order_by(func.sum(WorkoutSession.total_volume_kg).desc())
            .limit(20)
            .all()
        )

        user_ids = [r.user_id for r in rows]
        users = {
            u.id: {"username": u.username, "display_name": u.display_name, "avatar_url": u.avatar_url}
            for u in db.query(User).filter(User.id.in_(user_ids)).all()
        }

        leaderboard = [
            {
                "rank": idx + 1,
                "user_id": r.user_id,
                "username": users.get(r.user_id, {}).get("username", "Unknown"),
                "display_name": users.get(r.user_id, {}).get("display_name", "Unknown"),
                "avatar_url": users.get(r.user_id, {}).get("avatar_url"),
                "weekly_volume_kg": round(float(r.weekly_volume or 0), 1),
                "session_count": r.session_count,
            }
            for idx, r in enumerate(rows)
        ]

    try:
        r = _get_redis_sync()
        r.set("leaderboard:weekly", json.dumps(leaderboard), ex=86400)  # 24 h
        logger.info("Leaderboard cached — %d entries", len(leaderboard))
    except Exception as exc:
        logger.warning("Could not cache leaderboard to Redis: %s", exc)

    return {"status": "computed", "entries": len(leaderboard)}
