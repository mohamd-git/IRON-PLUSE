"""
AI service — IRON PULSE tactical AI coach.

Uses Groq (free 14k req/day) when GROQ_API_KEY is set.
Falls back to OpenAI when OPENAI_API_KEY is set.

- Streaming chat via Llama 3.3 70B / GPT-4o-mini
- Physique analysis via Llama 3.2 Vision / GPT-4o
- Program suggestion via user training history
"""

import json
import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger("ironpulse.ai")

_client: AsyncOpenAI | None = None

# Groq model names
GROQ_CHAT_MODEL = "llama-3.3-70b-versatile"
GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"  # Groq recommended vision model (replaces decommissioned 3.2-vision)
GROQ_FAST_MODEL = "llama-3.1-8b-instant"

# OpenAI fallback model names
OAI_CHAT_MODEL = "gpt-4o-mini"
OAI_VISION_MODEL = "gpt-4o"


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if settings.GROQ_API_KEY:
            _client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1",
            )
        else:
            _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def _chat_model() -> str:
    return GROQ_CHAT_MODEL if settings.GROQ_API_KEY else OAI_CHAT_MODEL


def _vision_model() -> str:
    return GROQ_VISION_MODEL if settings.GROQ_API_KEY else OAI_VISION_MODEL


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Streaming Coach
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def stream_coach_response(
    message: str,
    conversation_history: list[dict],
    user_context: dict,
) -> AsyncGenerator[str, None]:
    """Stream AI coach response as SSE chunks."""
    client = _get_client()

    system_prompt = (
        "You are the IRON PULSE tactical AI coach. "
        "Direct, evidence-based, military-adjacent tone. "
        "Max 150 words per response. "
        f"User: {user_context.get('experience_level', 'intermediate')} level, "
        f"goal: {user_context.get('primary_goal', 'general fitness')}. "
        f"Recent PRs: {user_context.get('recent_prs', 'none')}. "
        f"This week's volume: {user_context.get('weekly_volume_kg', 0)} kg."
    )

    messages = [{"role": "system", "content": system_prompt}]
    for item in conversation_history[-10:]:
        messages.append({"role": item.get("role", "user"), "content": item.get("content", "")})
    messages.append({"role": "user", "content": message})

    try:
        stream = await client.chat.completions.create(
            model=_chat_model(),
            messages=messages,
            temperature=0.7,
            max_tokens=300,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield f"data: {json.dumps({'content': delta.content})}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error("AI coach stream failed: %s", e)
        yield f"data: {json.dumps({'content': 'Stay focused, soldier. Connection interrupted. 💪'})}\n\n"
        yield "data: [DONE]\n\n"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Physique Analysis (Vision)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHYSIQUE_ANALYSIS_PROMPT = """You are IRON PULSE — a tactical physique analyst.
Analyze this physique photo and provide a structured assessment.

Return ONLY valid JSON with this schema:
{
  "overall_assessment": "string (2-3 sentences)",
  "muscle_development": {
    "upper_body": "string",
    "core": "string",
    "lower_body": "string"
  },
  "symmetry_notes": "string",
  "strengths": ["string"],
  "areas_for_improvement": ["string"],
  "recommended_protocols": [
    {
      "focus": "string",
      "exercise": "string",
      "rationale": "string"
    }
  ],
  "estimated_body_fat_range": "string"
}"""


async def analyze_physique(photo_base64: str) -> dict:
    """
    Physique analysis via Google Gemini Flash (free, 1500 req/day).
    Gemini accepts inline base64 natively — no URL upload needed.
    Falls back to a structured error if GEMINI_API_KEY is not set.
    """
    import httpx

    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set — physique analysis unavailable")
        return {
            "overall_assessment": "Physique analysis requires a Gemini API key. Add GEMINI_API_KEY to your .env file (free at aistudio.google.com).",
            "muscle_development": {"upper_body": "N/A", "core": "N/A", "lower_body": "N/A"},
            "symmetry_notes": "N/A",
            "strengths": [],
            "areas_for_improvement": [],
            "recommended_protocols": [],
            "estimated_body_fat_range": "N/A",
        }

    prompt = (
        PHYSIQUE_ANALYSIS_PROMPT
        + "\n\nAnalyze the physique in this photo. Return ONLY valid JSON — no markdown fences, no extra text."
    )

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": photo_base64}},
            ]
        }],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1500},
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        logger.info("Gemini physique response (first 200 chars): %s", raw[:200])

        # Strip markdown code fences if model added them
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
            if "```" in raw:
                raw = raw[:raw.rfind("```")]
            raw = raw.strip()

        return json.loads(raw)

    except Exception as e:
        logger.error("Gemini physique analysis failed: %s", e, exc_info=True)
        return {
            "overall_assessment": f"Analysis error: {e}",
            "muscle_development": {"upper_body": "N/A", "core": "N/A", "lower_body": "N/A"},
            "symmetry_notes": "N/A",
            "strengths": [],
            "areas_for_improvement": [],
            "recommended_protocols": [],
            "estimated_body_fat_range": "N/A",
        }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Program Suggestion
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRAM_PROMPT = """You are the IRON PULSE tactical AI coach.
Based on the following user data, generate a weekly training program.

Return ONLY valid JSON with this schema:
{
  "program_name": "string",
  "description": "string",
  "split_type": "string (e.g. PPL, Upper/Lower, Full Body)",
  "days": [
    {
      "day": "string (Monday, Tuesday, etc.)",
      "workout_name": "string",
      "focus": "string",
      "exercises": [
        {
          "name": "string",
          "sets": 3,
          "reps": "string (e.g. '8-10' or '5x5')",
          "rest_seconds": 90,
          "notes": "string"
        }
      ]
    }
  ],
  "weekly_notes": "string"
}"""


async def generate_program_suggestion(user_context: dict) -> dict:
    """Generate a personalised weekly program based on user's training data."""
    client = _get_client()
    user_prompt = (
        f"Training days per week: {user_context.get('training_days_per_week', 3)}\n"
        f"Primary goal: {user_context.get('primary_goal', 'general fitness')}\n"
        f"Experience level: {user_context.get('experience_level', 'intermediate')}\n"
        f"Available equipment: {user_context.get('equipment', 'full gym')}\n"
        f"Recent training focus: {user_context.get('recent_focus', 'mixed')}\n"
        f"Last 30 days sessions: {user_context.get('session_count_30d', 0)}\n"
        f"Current streak: {user_context.get('current_streak', 0)} days\n"
        f"Known weaknesses: {user_context.get('weaknesses', 'none noted')}"
    )
    try:
        response = await client.chat.completions.create(
            model=_chat_model(),
            messages=[
                {"role": "system", "content": PROGRAM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=3000,
        )
        raw = response.choices[0].message.content
        return json.loads(raw)
    except Exception as e:
        logger.error("Program suggestion failed: %s", e)
        return {
            "program_name": "Standard Protocol",
            "description": "AI generation temporarily unavailable. Here is a standard template.",
            "split_type": "Push/Pull/Legs",
            "days": [],
            "weekly_notes": "Retry later for a personalised program.",
        }


async def get_coaching_tip(context: str) -> str:
    """Get a quick coaching tip based on user context."""
    client = _get_client()
    try:
        response = await client.chat.completions.create(
            model=_chat_model(),
            messages=[
                {"role": "system", "content": "You are IRON PULSE AI coach. Give a brief, motivating, actionable fitness tip."},
                {"role": "user", "content": context},
            ],
            temperature=0.8,
            max_tokens=200,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error("Coaching tip failed: %s", e)
        return "Keep pushing! Consistency beats perfection. 💪"
