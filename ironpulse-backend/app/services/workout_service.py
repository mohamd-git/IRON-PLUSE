"""
Workout service — exercises, templates, session lifecycle,
set logging with PR detection (Epley 1RM), streak tracking.
"""

import datetime

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ForbiddenError, IronPulseError
from app.models.community import Notification, NotificationType
from app.models.user import User
from app.models.workout import (
    Exercise,
    PersonalRecord,
    WorkoutSession,
    WorkoutSet,
    WorkoutTemplate,
    SessionStatus,
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Exercises
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def list_exercises(
    db: AsyncSession,
    *,
    category: str | None = None,
    muscle_group: str | None = None,
    equipment: str | None = None,
    difficulty: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Exercise]:
    query = select(Exercise)

    if category:
        query = query.where(Exercise.category.ilike(f"%{category}%"))
    if muscle_group:
        # JSON array contains — use cast to text for cross-DB compat
        query = query.where(
            func.cast(Exercise.muscle_groups, type_=Exercise.muscle_groups.type)
            .cast(type_=func.text())
            .ilike(f"%{muscle_group}%")
        )
    if equipment:
        query = query.where(
            func.cast(Exercise.equipment, type_=Exercise.equipment.type)
            .cast(type_=func.text())
            .ilike(f"%{equipment}%")
        )
    if difficulty:
        query = query.where(Exercise.difficulty == difficulty)
    if search:
        query = query.where(Exercise.name.ilike(f"%{search}%"))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_exercise(
    exercise_id: str, db: AsyncSession
) -> Exercise:
    result = await db.execute(
        select(Exercise).where(Exercise.id == exercise_id)
    )
    ex = result.scalar_one_or_none()
    if not ex:
        raise NotFoundError("Exercise")
    return ex


async def get_user_recent_sets(
    user_id: str, exercise_id: str, db: AsyncSession, limit: int = 8
) -> list[WorkoutSet]:
    """Return the user's last N sets for a specific exercise."""
    result = await db.execute(
        select(WorkoutSet)
        .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)
        .where(
            and_(
                WorkoutSession.user_id == user_id,
                WorkoutSet.exercise_id == exercise_id,
            )
        )
        .order_by(WorkoutSet.logged_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def create_exercise(data: dict, db: AsyncSession) -> Exercise:
    exercise = Exercise(**data)
    db.add(exercise)
    await db.flush()
    await db.refresh(exercise)
    return exercise


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Templates
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def list_templates(
    db: AsyncSession,
    *,
    category: str | None = None,
    difficulty: str | None = None,
    is_vip: bool = False,
    skip: int = 0,
    limit: int = 50,
) -> list[WorkoutTemplate]:
    query = select(WorkoutTemplate)

    if category:
        query = query.where(WorkoutTemplate.category.ilike(f"%{category}%"))
    if difficulty:
        query = query.where(WorkoutTemplate.difficulty == difficulty)
    if not is_vip:
        query = query.where(WorkoutTemplate.is_vip_only.is_(False))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_template(
    template_id: str, db: AsyncSession
) -> WorkoutTemplate:
    result = await db.execute(
        select(WorkoutTemplate).where(WorkoutTemplate.id == template_id)
    )
    tmpl = result.scalar_one_or_none()
    if not tmpl:
        raise NotFoundError("WorkoutTemplate")
    return tmpl


async def get_exercises_by_ids(
    exercise_ids: list[str], db: AsyncSession
) -> list[Exercise]:
    if not exercise_ids:
        return []
    result = await db.execute(
        select(Exercise).where(Exercise.id.in_(exercise_ids))
    )
    return list(result.scalars().all())


async def create_template(data: dict, db: AsyncSession) -> WorkoutTemplate:
    template = WorkoutTemplate(**data)
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Sessions — start
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def start_session(
    user_id: str,
    name: str,
    template_id: str | None,
    db: AsyncSession,
) -> WorkoutSession:
    session = WorkoutSession(
        user_id=user_id,
        template_id=template_id,
        name=name,
        started_at=datetime.datetime.now(datetime.timezone.utc),
        status=SessionStatus.active,
        total_volume_kg=0.0,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Sessions — log set  (PR detection via Epley 1RM)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def log_set(
    user_id: str,
    session_id: str,
    exercise_id: str,
    set_number: int,
    reps: int,
    weight_kg: float,
    rpe: int | None,
    db: AsyncSession,
) -> dict:
    # 1. Verify session belongs to user and is active
    session = await _get_active_session(session_id, user_id, db)

    # 2. Save WorkoutSet
    workout_set = WorkoutSet(
        session_id=session_id,
        exercise_id=exercise_id,
        set_number=set_number,
        reps=reps,
        weight_kg=weight_kg,
        rpe=rpe,
        is_pr=False,
    )
    db.add(workout_set)
    await db.flush()

    # 3. Calculate 1RM via Epley formula
    one_rep_max = weight_kg * (1 + reps / 30)

    # 4. Compare to existing PR
    result = await db.execute(
        select(PersonalRecord)
        .where(
            and_(
                PersonalRecord.user_id == user_id,
                PersonalRecord.exercise_id == exercise_id,
            )
        )
        .order_by(PersonalRecord.one_rep_max.desc())
        .limit(1)
    )
    existing_pr = result.scalar_one_or_none()

    is_pr = False
    pr_data = None

    if not existing_pr or one_rep_max > existing_pr.one_rep_max:
        # 5. New PR!
        is_pr = True
        workout_set.is_pr = True

        pr = PersonalRecord(
            user_id=user_id,
            exercise_id=exercise_id,
            weight_kg=weight_kg,
            reps=reps,
            one_rep_max=round(one_rep_max, 2),
            session_id=session_id,
        )
        db.add(pr)
        await db.flush()
        await db.refresh(pr)

        # Get exercise name for notification
        exercise = await get_exercise(exercise_id, db)

        # Create notification
        notification = Notification(
            user_id=user_id,
            notification_type=NotificationType.pr,
            title="New Personal Record! 🏆",
            body=f"You hit a new PR on {exercise.name}: {weight_kg}kg × {reps} reps (1RM: {one_rep_max:.1f}kg)",
            metadata_json={
                "pr_id": pr.id,
                "exercise_id": exercise_id,
                "exercise_name": exercise.name,
                "weight_kg": weight_kg,
                "reps": reps,
                "one_rep_max": round(one_rep_max, 2),
            },
        )
        db.add(notification)

        pr_data = {
            "pr_id": pr.id,
            "exercise_id": exercise_id,
            "exercise_name": exercise.name,
            "weight_kg": weight_kg,
            "reps": reps,
            "one_rep_max": round(one_rep_max, 2),
            "achieved_at": pr.achieved_at.isoformat()
            if pr.achieved_at
            else datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

        # Emit real-time WebSocket event
        try:
            from app.core.websocket import manager
            import asyncio
            asyncio.ensure_future(
                manager.send_to_user(user_id, "pr_achieved", pr_data)
            )
        except Exception:
            pass

    # 6. Add volume to session
    session.total_volume_kg = (session.total_volume_kg or 0) + (weight_kg * reps)
    await db.flush()

    return {
        "set_id": workout_set.id,
        "is_pr": is_pr,
        "pr_data": pr_data,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Sessions — complete  (streak logic + Celery trigger)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def complete_session(
    session_id: str, user_id: str, db: AsyncSession
) -> dict:
    session = await _get_active_session(session_id, user_id, db)
    now = datetime.datetime.now(datetime.timezone.utc)

    # Set completion data
    session.completed_at = now
    session.status = SessionStatus.completed
    session.duration_seconds = int(
        (now - session.started_at).total_seconds()
    )

    # Count PRs in this session
    pr_count_result = await db.execute(
        select(func.count()).where(
            and_(
                WorkoutSet.session_id == session_id,
                WorkoutSet.is_pr.is_(True),
            )
        )
    )
    pr_count = pr_count_result.scalar() or 0

    # Count total sets
    total_sets_result = await db.execute(
        select(func.count()).where(WorkoutSet.session_id == session_id)
    )
    total_sets = total_sets_result.scalar() or 0

    # Streak logic
    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one()
    today = now.date()

    if user.last_workout_date:
        days_since = (today - user.last_workout_date).days
        if days_since <= 1:
            # Same day or consecutive — keep/increment streak
            if days_since == 1:
                user.current_streak += 1
            # days_since == 0 means same day, don't increment
        elif days_since == 2:
            # Within 48-hour window
            user.current_streak += 1
        else:
            # Streak broken
            user.current_streak = 1
    else:
        user.current_streak = 1

    if user.current_streak > user.longest_streak:
        user.longest_streak = user.current_streak

    user.last_workout_date = today
    await db.flush()

    # Trigger Celery analytics task
    try:
        from app.tasks.analytics_tasks import generate_session_analytics

        generate_session_analytics.delay(session_id)
    except Exception:
        pass  # Don't fail completion if Celery is down

    return {
        "session": session,
        "total_sets": total_sets,
        "total_volume_kg": session.total_volume_kg or 0,
        "duration_seconds": session.duration_seconds,
        "pr_count": pr_count,
        "current_streak": user.current_streak,
        "longest_streak": user.longest_streak,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Sessions — abandon
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def abandon_session(
    session_id: str, user_id: str, db: AsyncSession
) -> WorkoutSession:
    session = await _get_active_session(session_id, user_id, db)
    session.status = SessionStatus.abandoned
    session.completed_at = datetime.datetime.now(datetime.timezone.utc)
    await db.flush()
    return session


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Sessions — retrieve / history
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def get_session(
    session_id: str, db: AsyncSession
) -> WorkoutSession:
    result = await db.execute(
        select(WorkoutSession).where(WorkoutSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("WorkoutSession")
    return session


async def get_session_sets(
    session_id: str, db: AsyncSession
) -> list[WorkoutSet]:
    result = await db.execute(
        select(WorkoutSet)
        .where(WorkoutSet.session_id == session_id)
        .order_by(WorkoutSet.set_number.asc())
    )
    return list(result.scalars().all())


async def list_user_sessions(
    user_id: str, db: AsyncSession, skip: int = 0, limit: int = 20
) -> list[dict]:
    """Sessions + PR count per session, most recent first."""
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user_id)
        .order_by(WorkoutSession.started_at.desc())
        .offset(skip)
        .limit(limit)
    )
    sessions = list(result.scalars().all())

    out = []
    for s in sessions:
        pr_q = await db.execute(
            select(func.count()).where(
                and_(
                    WorkoutSet.session_id == s.id,
                    WorkoutSet.is_pr.is_(True),
                )
            )
        )
        pr_count = pr_q.scalar() or 0
        out.append({"session": s, "pr_count": pr_count})
    return out


async def get_session_summary(
    session_id: str, db: AsyncSession
) -> dict:
    """Full session: sets grouped by exercise, PR flags, volume, duration."""
    session = await get_session(session_id, db)
    sets = await get_session_sets(session_id, db)

    # Group sets by exercise
    exercise_ids = list({s.exercise_id for s in sets})
    exercises = await get_exercises_by_ids(exercise_ids, db)
    exercise_map = {e.id: e for e in exercises}

    groups: dict[str, dict] = {}
    total_volume = 0.0
    pr_count = 0

    for s in sets:
        vol = (s.weight_kg or 0) * (s.reps or 0)
        total_volume += vol
        if s.is_pr:
            pr_count += 1

        if s.exercise_id not in groups:
            groups[s.exercise_id] = {
                "exercise": exercise_map.get(s.exercise_id),
                "sets": [],
                "has_pr": False,
            }
        groups[s.exercise_id]["sets"].append(s)
        if s.is_pr:
            groups[s.exercise_id]["has_pr"] = True

    return {
        "session": session,
        "exercise_groups": list(groups.values()),
        "total_volume_kg": round(total_volume, 2),
        "pr_count": pr_count,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Personal Records
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def get_user_prs_grouped(
    user_id: str, db: AsyncSession
) -> list[dict]:
    """All PRs for a user, grouped by exercise."""
    result = await db.execute(
        select(PersonalRecord)
        .where(PersonalRecord.user_id == user_id)
        .order_by(
            PersonalRecord.exercise_id,
            PersonalRecord.one_rep_max.desc(),
        )
    )
    prs = list(result.scalars().all())

    # Group by exercise
    exercise_ids = list({pr.exercise_id for pr in prs})
    exercises = await get_exercises_by_ids(exercise_ids, db)
    exercise_map = {e.id: e for e in exercises}

    groups: dict[str, dict] = {}
    for pr in prs:
        if pr.exercise_id not in groups:
            groups[pr.exercise_id] = {
                "exercise": exercise_map.get(pr.exercise_id),
                "records": [],
            }
        groups[pr.exercise_id]["records"].append(pr)

    return list(groups.values())


async def get_prs_for_exercise(
    user_id: str, exercise_id: str, db: AsyncSession
) -> dict:
    """PRs + last 8 sessions history for a specific exercise."""
    exercise = await get_exercise(exercise_id, db)

    pr_result = await db.execute(
        select(PersonalRecord)
        .where(
            and_(
                PersonalRecord.user_id == user_id,
                PersonalRecord.exercise_id == exercise_id,
            )
        )
        .order_by(PersonalRecord.one_rep_max.desc())
    )
    prs = list(pr_result.scalars().all())
    recent_sets = await get_user_recent_sets(user_id, exercise_id, db, 8)

    return {
        "exercise": exercise,
        "records": prs,
        "recent_sets": recent_sets,
    }


async def get_recent_prs(
    user_id: str, db: AsyncSession, days: int = 30
) -> list[dict]:
    """PRs from the last N days with session data."""
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(
        days=days
    )
    result = await db.execute(
        select(PersonalRecord)
        .where(
            and_(
                PersonalRecord.user_id == user_id,
                PersonalRecord.achieved_at >= cutoff,
            )
        )
        .order_by(PersonalRecord.achieved_at.desc())
    )
    prs = list(result.scalars().all())

    # Enrich with exercise + session names
    exercise_ids = list({pr.exercise_id for pr in prs})
    exercises = await get_exercises_by_ids(exercise_ids, db)
    exercise_map = {e.id: e for e in exercises}

    session_ids = [pr.session_id for pr in prs if pr.session_id]
    sessions_map: dict[str, WorkoutSession] = {}
    if session_ids:
        s_result = await db.execute(
            select(WorkoutSession).where(WorkoutSession.id.in_(session_ids))
        )
        for s in s_result.scalars().all():
            sessions_map[s.id] = s

    out = []
    for pr in prs:
        out.append(
            {
                "pr": pr,
                "exercise_name": exercise_map[pr.exercise_id].name
                if pr.exercise_id in exercise_map
                else None,
                "session_name": sessions_map[pr.session_id].name
                if pr.session_id and pr.session_id in sessions_map
                else None,
            }
        )
    return out


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Helpers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def _get_active_session(
    session_id: str, user_id: str, db: AsyncSession
) -> WorkoutSession:
    """Fetch session and validate ownership + active status."""
    session = await get_session(session_id, db)
    if session.user_id != user_id:
        raise ForbiddenError("This session belongs to another user")
    if session.status != SessionStatus.active:
        raise IronPulseError(
            f"Session is already {session.status.value}", status_code=400
        )
    return session
