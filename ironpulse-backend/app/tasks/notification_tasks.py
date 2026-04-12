"""
Celery tasks — notifications (push via Firebase FCM, email via Resend).
All tasks are synchronous (Celery workers are sync).
"""

import logging
import os

from app.tasks.celery_app import celery_app

logger = logging.getLogger("ironpulse.tasks.notifications")

# ── Lazy Firebase init (once per worker process) ──────
_firebase_initialized = False


def _get_fcm():
    """Return firebase_admin.messaging, initialising the SDK if needed."""
    global _firebase_initialized
    if not _firebase_initialized:
        try:
            import firebase_admin
            from firebase_admin import credentials
            from app.config import settings

            path = settings.FIREBASE_SERVICE_ACCOUNT_PATH
            if os.path.exists(path) and not firebase_admin._apps:
                cred = credentials.Certificate(path)
                firebase_admin.initialize_app(cred)
            _firebase_initialized = True
        except Exception as exc:
            logger.error("Firebase init failed in worker: %s", exc)
            return None

    try:
        from firebase_admin import messaging
        return messaging
    except Exception:
        return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  send_push
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@celery_app.task(name="app.tasks.notification_tasks.send_push")
def send_push(user_id: str, title: str, body: str, fcm_token: str | None = None) -> dict:
    """Send a push notification via Firebase FCM."""
    if not fcm_token:
        logger.debug("PUSH skipped — no FCM token for user %s", user_id)
        return {"sent": False, "reason": "no_fcm_token"}

    messaging = _get_fcm()
    if not messaging:
        logger.warning("PUSH skipped — Firebase not available")
        return {"sent": False, "reason": "firebase_unavailable"}

    try:
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=fcm_token,
        )
        response = messaging.send(message)
        logger.info("PUSH sent → user=%s  message_id=%s", user_id, response)
        return {"sent": True, "message_id": response}
    except Exception as exc:
        logger.error("PUSH failed → user=%s  error=%s", user_id, exc)
        return {"sent": False, "error": str(exc)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  send_email
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@celery_app.task(name="app.tasks.notification_tasks.send_email")
def send_email(to: str, subject: str, html_body: str) -> dict:
    """Send a transactional email via Resend."""
    try:
        import resend
        from app.config import settings

        if not settings.RESEND_API_KEY:
            logger.warning("EMAIL skipped — RESEND_API_KEY not set")
            return {"sent": False, "reason": "no_api_key"}

        resend.api_key = settings.RESEND_API_KEY
        params: resend.Emails.SendParams = {
            "from": settings.EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html_body,
        }
        response = resend.Emails.send(params)
        logger.info("EMAIL sent → to=%s  id=%s", to, response.get("id"))
        return {"sent": True, "id": response.get("id")}
    except Exception as exc:
        logger.error("EMAIL failed → to=%s  error=%s", to, exc)
        return {"sent": False, "error": str(exc)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  send_workout_reminder
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@celery_app.task(name="app.tasks.notification_tasks.send_workout_reminder")
def send_workout_reminder(user_id: str, fcm_token: str | None = None) -> dict:
    """Remind user to work out today."""
    return send_push(
        user_id,
        "Time to Train! 🏋️",
        "Don't break your streak — hit the gym today!",
        fcm_token=fcm_token,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  send_vip_welcome
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@celery_app.task(name="app.tasks.notification_tasks.send_vip_welcome")
def send_vip_welcome(user_id: str, email: str, fcm_token: str | None = None) -> dict:
    """Welcome push + email for new VIP subscribers."""
    push_result = send_push(
        user_id,
        "Welcome to VIP 🏆",
        "You now have access to premium features!",
        fcm_token=fcm_token,
    )
    email_result = send_email(
        email,
        "Welcome to IRON PULSE VIP 🏆",
        _vip_welcome_html(),
    )
    return {"push": push_result, "email": email_result}


def _vip_welcome_html() -> str:
    return """
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#e11d48;">Welcome to IRON PULSE VIP 🏆</h2>
      <p>Your VIP subscription is now active. You have access to:</p>
      <ul>
        <li>Exclusive workout templates</li>
        <li>AI coaching &amp; physique analysis</li>
        <li>Priority support</li>
        <li>VIP community lounge</li>
      </ul>
      <p>Train hard. Stay elite.</p>
    </div>
    """
