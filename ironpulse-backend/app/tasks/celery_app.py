"""
Celery application instance.
"""

from celery import Celery

from app.config import settings

celery_app = Celery(
    "ironpulse",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.notification_tasks",
        "app.tasks.analytics_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kuala_Lumpur",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# ── Periodic beat schedule ────────────────────────────
celery_app.conf.beat_schedule = {
    "check-expired-vip-daily": {
        "task": "app.tasks.analytics_tasks.check_expired_vip",
        "schedule": 86400.0,  # every 24 hours
    },
    "compute-leaderboard-daily": {
        "task": "app.tasks.analytics_tasks.compute_leaderboard",
        "schedule": 86400.0,  # every 24 hours
    },
}
