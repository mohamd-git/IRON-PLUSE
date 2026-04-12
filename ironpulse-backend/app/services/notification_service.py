"""
Notification service — push (Firebase FCM) and email (Resend).
"""

import logging
import os

import resend
from app.config import settings

logger = logging.getLogger("ironpulse.notifications")

# ── Resend client setup ───────────────────────────────
resend.api_key = settings.RESEND_API_KEY

# ── Firebase Admin SDK setup ─────────────────────────
_firebase_initialized = False


def _init_firebase() -> bool:
    """Lazily initialise Firebase Admin SDK. Returns True if available."""
    global _firebase_initialized
    if _firebase_initialized:
        return True
    try:
        import firebase_admin
        from firebase_admin import credentials

        path = settings.FIREBASE_SERVICE_ACCOUNT_PATH
        if not os.path.exists(path):
            logger.warning("Firebase service account not found at %s — push disabled", path)
            return False

        if not firebase_admin._apps:
            cred = credentials.Certificate(path)
            firebase_admin.initialize_app(cred)

        _firebase_initialized = True
        return True
    except Exception as exc:
        logger.error("Firebase init failed: %s", exc)
        return False


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Push notifications via Firebase FCM
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def send_push_notification(
    user_id: str,
    title: str,
    body: str,
    fcm_token: str | None = None,
    data: dict | None = None,
) -> None:
    """
    Send a push notification to a user's device via Firebase FCM.
    Requires the user's FCM token (stored in user.settings['fcm_token']).
    """
    if not fcm_token:
        logger.debug("PUSH skipped — no FCM token for user %s", user_id[:8])
        return

    if not _init_firebase():
        logger.warning("PUSH skipped — Firebase not initialised")
        return

    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=fcm_token,
        )
        response = messaging.send(message)
        logger.info("PUSH sent → user=%s  message_id=%s", user_id[:8], response)
    except Exception as exc:
        logger.error("PUSH failed → user=%s  error=%s", user_id[:8], exc)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Email via Resend
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def send_email(to: str, subject: str, html_body: str) -> None:
    """Send a transactional email via Resend."""
    if not settings.RESEND_API_KEY:
        logger.warning("EMAIL skipped — RESEND_API_KEY not configured")
        return

    try:
        params: resend.Emails.SendParams = {
            "from": settings.EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html_body,
        }
        response = resend.Emails.send(params)
        logger.info("EMAIL sent → to=%s  id=%s", to, response.get("id"))
    except Exception as exc:
        logger.error("EMAIL failed → to=%s  error=%s", to, exc)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Convenience wrappers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def notify_workout_completed(
    user_id: str, workout_title: str, fcm_token: str | None = None
) -> None:
    await send_push_notification(
        user_id,
        "Workout Complete 💪",
        f'Great job finishing "{workout_title}"!',
        fcm_token=fcm_token,
    )


async def notify_vip_activated(
    user_id: str, email: str, fcm_token: str | None = None
) -> None:
    await send_push_notification(
        user_id,
        "VIP Activated 🏆",
        "Welcome to IRON PULSE VIP! Enjoy your premium features.",
        fcm_token=fcm_token,
    )
    await send_email(
        to=email,
        subject="Welcome to IRON PULSE VIP 🏆",
        html_body=_vip_welcome_html(),
    )


async def send_password_reset_email(to: str, code: str) -> None:
    await send_email(
        to=to,
        subject="Your IRON PULSE password reset code",
        html_body=_password_reset_html(code),
    )


async def send_verification_email(to: str, user_id: str, token: str) -> None:
    verify_url = f"{settings.FRONTEND_URL}/verify-email?user_id={user_id}&token={token}"
    await send_email(
        to=to,
        subject="Verify your IRON PULSE account",
        html_body=_verification_html(verify_url),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Email HTML templates
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _password_reset_html(code: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#e11d48;">IRON PULSE</h2>
      <p>You requested a password reset. Use the code below — it expires in 15 minutes.</p>
      <div style="font-size:2rem;font-weight:bold;letter-spacing:0.3em;
                  background:#f1f5f9;padding:1rem;text-align:center;border-radius:8px;">
        {code}
      </div>
      <p style="color:#64748b;font-size:0.85rem;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    """


def _verification_html(verify_url: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#e11d48;">IRON PULSE</h2>
      <p>Thanks for signing up! Please verify your email address to get started.</p>
      <a href="{verify_url}"
         style="display:inline-block;background:#e11d48;color:#fff;padding:12px 24px;
                border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
        Verify Email
      </a>
      <p style="color:#64748b;font-size:0.85rem;">
        This link expires in 24 hours. If you didn't create an account, ignore this email.
      </p>
    </div>
    """


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
