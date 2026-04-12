"""
AI Coach router — VIP-only streaming chat, physique analysis, program suggestion.

POST /ai/coach               — streaming SSE chat with GPT-4
POST /ai/analyze-physique     — GPT-4-Vision physique assessment
GET  /ai/program-suggestion   — personalised weekly program
"""

import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_vip
from app.models.user import User
from app.models.workout import PersonalRecord, WorkoutSession, WorkoutSet
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["AI Coach"])


# ── Schemas ───────────────────────────────────────────
class CoachRequest(BaseModel):
    message: str
    conversation_history: list[dict] = []


class PhysiqueAnalysisRequest(BaseModel):
    photo_base64: str


# ── Helpers ───────────────────────────────────────────
async def _build_user_context(user: User, db: AsyncSession) -> dict:
    """Build context dict from user profile + recent training data."""
    now = datetime.datetime.now(datetime.timezone.utc)
    seven_days_ago = now - datetime.timedelta(days=7)
    thirty_days_ago = now - datetime.timedelta(days=30)

    # Recent PRs (last 7 days)
    prs_q = await db.execute(
        select(PersonalRecord)
        .where(
            PersonalRecord.user_id == user.id,
            PersonalRecord.achieved_at >= seven_days_ago,
        )
        .order_by(PersonalRecord.achieved_at.desc())
        .limit(5)
    )
    recent_prs = list(prs_q.scalars().all())
    pr_strs = [
        f"{pr.weight_kg}kg x{pr.reps} (1RM: {pr.one_rep_max:.1f})"
        for pr in recent_prs
    ]

    # This week's volume
    vol_q = await db.execute(
        select(func.coalesce(func.sum(WorkoutSession.total_volume_kg), 0)).where(
            and_(
                WorkoutSession.user_id == user.id,
                WorkoutSession.status == "completed",
                WorkoutSession.completed_at >= seven_days_ago,
            )
        )
    )
    weekly_volume = vol_q.scalar() or 0

    # Last 30 days session count
    session_count_q = await db.execute(
        select(func.count()).where(
            and_(
                WorkoutSession.user_id == user.id,
                WorkoutSession.status == "completed",
                WorkoutSession.completed_at >= thirty_days_ago,
            )
        )
    )
    session_count_30d = session_count_q.scalar() or 0

    # Recent training focus (most common exercise category last 30 days)
    focus_q = await db.execute(
        select(WorkoutSession.name)
        .where(
            and_(
                WorkoutSession.user_id == user.id,
                WorkoutSession.status == "completed",
                WorkoutSession.completed_at >= thirty_days_ago,
            )
        )
        .order_by(WorkoutSession.completed_at.desc())
        .limit(5)
    )
    recent_sessions = [row[0] for row in focus_q.all()]

    return {
        "experience_level": user.experience_level.value
        if hasattr(user.experience_level, "value") and user.experience_level
        else "intermediate",
        "primary_goal": user.primary_goal.value
        if hasattr(user.primary_goal, "value") and user.primary_goal
        else "general fitness",
        "recent_prs": ", ".join(pr_strs) if pr_strs else "none this week",
        "weekly_volume_kg": float(weekly_volume),
        "training_days_per_week": user.training_days_per_week or 3,
        "current_streak": user.current_streak or 0,
        "session_count_30d": session_count_30d,
        "recent_focus": ", ".join(recent_sessions) if recent_sessions else "mixed",
        "equipment": "full gym",
        "weaknesses": "none noted",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /ai/coach
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/coach")
async def ai_coach(
    data: CoachRequest,
    user: User = Depends(require_vip),
    db: AsyncSession = Depends(get_db),
):
    """
    VIP-only: Streaming AI coach.
    Builds system prompt with user context (goal, level, PRs, volume),
    streams GPT-4 response via Server-Sent Events.
    """
    context = await _build_user_context(user, db)

    return StreamingResponse(
        ai_service.stream_coach_response(
            message=data.message,
            conversation_history=data.conversation_history,
            user_context=context,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /ai/analyze-physique
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/analyze-physique")
async def analyze_physique(
    data: PhysiqueAnalysisRequest,
    user: User = Depends(require_vip),
):
    """
    VIP-only: Send a base64 photo to GPT-4-Vision.
    Returns structured analysis: muscle development, symmetry,
    strengths, weaknesses, and protocol recommendations.
    """
    analysis = await ai_service.analyze_physique(data.photo_base64)
    return {
        "user_id": user.id,
        "analysis": analysis,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /ai/program-suggestion
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/vision-test")
async def vision_test():
    """NO AUTH — tries every available Groq vision model, returns first that works."""
    import traceback
    import httpx
    from openai import AsyncOpenAI
    from app.config import settings

    test_image_url = "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80"

    # Models to try in order
    models = [
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "meta-llama/llama-4-maverick-17b-128e-instruct",
        "llama-3.2-90b-vision-preview",
    ]

    client = AsyncOpenAI(
        api_key=settings.GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )

    results = {}
    for model in models:
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this image in one sentence."},
                        {"type": "image_url", "image_url": {"url": test_image_url}},
                    ],
                }],
                max_tokens=60,
            )
            return {"ok": True, "model": model, "reply": resp.choices[0].message.content}
        except Exception as e:
            results[model] = str(e)

    return {"ok": False, "all_errors": results}


@router.get("/program-suggestion")
async def program_suggestion(
    user: User = Depends(require_vip),
    db: AsyncSession = Depends(get_db),
):
    """
    VIP-only: Generate a suggested weekly program based on
    training_days_per_week, primary_goal, equipment,
    and last 30 days of session data.
    """
    context = await _build_user_context(user, db)
    program = await ai_service.generate_program_suggestion(context)

    return {
        "user_id": user.id,
        "program": program,
    }
