"""
Integrations router — wearable device connections + webhooks.

GET  /integrations/status                — connected integrations
POST /integrations/apple-health/connect  — save token
POST /integrations/garmin/connect        — OAuth2 redirect URL
POST /integrations/garmin/webhook        — activity payload
POST /integrations/whoop/connect         — OAuth2 save token
GET  /integrations/health                — liveness probe
"""

import logging

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger("ironpulse.integrations")

router = APIRouter(prefix="/integrations", tags=["Integrations"])


# ── Schemas ───────────────────────────────────────────
class AppleHealthConnect(BaseModel):
    token: str
    device_name: str | None = None


class GarminConnect(BaseModel):
    redirect_uri: str | None = None


class WhoopConnect(BaseModel):
    token: str
    device_name: str | None = None


# ── Helpers ───────────────────────────────────────────
def _get_integrations(user: User) -> dict:
    """Extract integrations dict from user.settings JSON."""
    if not user.settings:
        return {}
    return user.settings.get("integrations", {})


def _save_integrations(user: User, integrations: dict) -> None:
    """Persist integrations dict into user.settings JSON."""
    if user.settings is None:
        user.settings = {}
    user.settings = {**user.settings, "integrations": integrations}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /integrations/health
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/health")
async def health_check():
    """Simple liveness probe."""
    return {"status": "healthy", "service": "iron-pulse-api"}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /integrations/status
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/status")
async def integrations_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return user's connected integrations with connection status."""
    integrations = _get_integrations(user)

    return {
        "apple_health": {
            "connected": bool(integrations.get("apple_health", {}).get("token")),
            "device": integrations.get("apple_health", {}).get("device_name"),
        },
        "garmin": {
            "connected": bool(integrations.get("garmin", {}).get("token")),
            "device": integrations.get("garmin", {}).get("device_name"),
        },
        "whoop": {
            "connected": bool(integrations.get("whoop", {}).get("token")),
            "device": integrations.get("whoop", {}).get("device_name"),
        },
        "strava": {
            "connected": bool(integrations.get("strava", {}).get("token")),
        },
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /integrations/apple-health/connect
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/apple-health/connect")
async def connect_apple_health(
    data: AppleHealthConnect,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save Apple Health token into user.settings."""
    integrations = _get_integrations(user)
    integrations["apple_health"] = {
        "token": data.token,
        "device_name": data.device_name,
        "connected": True,
    }
    _save_integrations(user, integrations)
    await db.flush()

    return {"message": "Apple Health connected", "device": data.device_name}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /integrations/garmin/connect
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/garmin/connect")
async def connect_garmin(
    data: GarminConnect,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate Garmin OAuth2 flow.
    Returns a redirect URL for the user to authorize on Garmin's site.
    """
    # Build OAuth2 authorization URL
    redirect_uri = data.redirect_uri or f"{settings.API_URL}/api/v1/integrations/garmin/callback"
    garmin_auth_url = (
        "https://connect.garmin.com/oauthConfirm"
        f"?oauth_callback={redirect_uri}"
        f"&oauth_consumer_key={settings.GARMIN_CONSUMER_KEY}"
    )

    # Store pending state
    integrations = _get_integrations(user)
    integrations["garmin"] = {
        "pending": True,
        "redirect_uri": redirect_uri,
    }
    _save_integrations(user, integrations)
    await db.flush()

    return {
        "message": "Redirect user to authorize",
        "redirect_url": garmin_auth_url,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /integrations/garmin/webhook
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/garmin/webhook")
async def garmin_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Receive Garmin activity payload.
    Parses HRV, steps, sleep data and persists in user.settings["wearable_data"].
    """
    import datetime
    from sqlalchemy import select as sa_select
    from app.models.user import User

    payload = await request.json()
    logger.info("Garmin webhook received")

    activities = payload.get("activities", payload.get("activityDetails", []))
    if not activities:
        activities = [payload]

    processed = 0
    for activity in activities:
        # Map Garmin user token → our user
        garmin_user_token = activity.get("userAccessToken") or payload.get("userAccessToken")
        if not garmin_user_token:
            logger.warning("Garmin webhook: no userAccessToken in payload, skipping activity")
            continue

        # Look up user by stored Garmin token
        result = await db.execute(sa_select(User))
        users = result.scalars().all()
        user = next(
            (
                u for u in users
                if u.settings
                and u.settings.get("integrations", {}).get("garmin", {}).get("token") == garmin_user_token
            ),
            None,
        )
        if not user:
            logger.warning("Garmin webhook: no user found for token")
            continue

        wearable_data = {
            "source": "garmin",
            "recorded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "heart_rate_avg": activity.get("averageHeartRateInBeatsPerMinute"),
            "heart_rate_max": activity.get("maxHeartRateInBeatsPerMinute"),
            "steps": activity.get("steps"),
            "calories": activity.get("activeKilocalories"),
            "distance_m": activity.get("distanceInMeters"),
            "duration_sec": activity.get("durationInSeconds"),
            "hrv_data": activity.get("hrvData"),
            "sleep_data": activity.get("sleepData"),
            "activity_type": activity.get("activityType"),
        }

        # Persist to user.settings (append to history list)
        settings_blob = user.settings or {}
        history: list = settings_blob.get("wearable_data", [])
        history.append(wearable_data)
        # Keep last 90 entries
        settings_blob["wearable_data"] = history[-90:]
        user.settings = {**settings_blob}
        await db.flush()

        logger.info("Garmin data saved for user %s", user.id[:8])
        processed += 1

    return {"status": "received", "activities_processed": processed}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /integrations/whoop/connect
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/whoop/connect")
async def connect_whoop(
    data: WhoopConnect,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save WHOOP OAuth2 token into user.settings."""
    integrations = _get_integrations(user)
    integrations["whoop"] = {
        "token": data.token,
        "device_name": data.device_name,
        "connected": True,
    }
    _save_integrations(user, integrations)
    await db.flush()

    return {"message": "WHOOP connected", "device": data.device_name}
