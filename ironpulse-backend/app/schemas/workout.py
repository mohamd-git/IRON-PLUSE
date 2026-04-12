"""
Workout, exercise, session, template, set, and PR schemas.
All IDs are UUID strings.
"""

import datetime
from pydantic import BaseModel, Field


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Exercise
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class ExerciseCreate(BaseModel):
    name: str
    category: str
    muscle_groups: list[str] = []
    equipment: list[str] = []
    difficulty: str = "intermediate"
    description: str | None = None
    form_steps: list[str] = []
    image_url: str | None = None
    video_url: str | None = None


class ExerciseOut(BaseModel):
    id: str
    name: str
    category: str
    muscle_groups: list | None = None
    equipment: list | None = None
    difficulty: str
    description: str | None = None
    form_steps: list | None = None
    image_url: str | None = None
    video_url: str | None = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class SetHistoryItem(BaseModel):
    id: str
    set_number: int
    reps: int | None = None
    weight_kg: float | None = None
    rpe: int | None = None
    is_pr: bool = False
    logged_at: datetime.datetime

    model_config = {"from_attributes": True}


class ExerciseDetailOut(BaseModel):
    """Exercise + the authenticated user's last 8 sets."""
    exercise: ExerciseOut
    recent_sets: list[SetHistoryItem] = []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Workout Template
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TemplateExerciseItem(BaseModel):
    exercise_id: str
    sets: int = 3
    reps: int | None = None
    rest_seconds: int = 60
    notes: str | None = None


class TemplateCreate(BaseModel):
    name: str
    description: str | None = None
    category: str
    difficulty: str = "intermediate"
    duration_minutes: int = 45
    trainer_name: str | None = None
    trainer_avatar_url: str | None = None
    is_vip_only: bool = False
    thumbnail_url: str | None = None
    exercises: list[TemplateExerciseItem] = []


class TemplateOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    category: str
    difficulty: str
    duration_minutes: int
    trainer_name: str | None = None
    trainer_avatar_url: str | None = None
    is_vip_only: bool
    thumbnail_url: str | None = None
    exercises: list | None = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class TemplateDetailOut(BaseModel):
    """Template with fully expanded exercise objects."""
    template: TemplateOut
    exercise_details: list[ExerciseOut] = []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Workout Session
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class SessionStartRequest(BaseModel):
    template_id: str | None = None
    name: str


class SessionOut(BaseModel):
    id: str
    user_id: str
    template_id: str | None = None
    name: str
    started_at: datetime.datetime
    completed_at: datetime.datetime | None = None
    duration_seconds: int | None = None
    total_volume_kg: float | None = None
    notes: str | None = None
    status: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class SessionWithSets(SessionOut):
    sets: list[SetHistoryItem] = []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Workout Set  (logging)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class LogSetRequest(BaseModel):
    exercise_id: str
    set_number: int
    reps: int
    weight_kg: float
    rpe: int | None = Field(None, ge=1, le=10)


class PRData(BaseModel):
    pr_id: str
    exercise_id: str
    weight_kg: float
    reps: int
    one_rep_max: float
    achieved_at: datetime.datetime


class LogSetResponse(BaseModel):
    set_id: str
    is_pr: bool
    pr_data: PRData | None = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Session complete / summary
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class SessionCompleteResponse(BaseModel):
    session: SessionOut
    total_sets: int
    total_volume_kg: float
    duration_seconds: int
    pr_count: int
    current_streak: int
    longest_streak: int


class ExerciseGroupSets(BaseModel):
    exercise: ExerciseOut
    sets: list[SetHistoryItem] = []
    has_pr: bool = False


class SessionSummaryOut(BaseModel):
    session: SessionOut
    exercise_groups: list[ExerciseGroupSets] = []
    total_volume_kg: float = 0
    pr_count: int = 0


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Session history list item
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class SessionHistoryItem(SessionOut):
    pr_count: int = 0


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Personal Records
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class PROut(BaseModel):
    id: str
    user_id: str
    exercise_id: str
    weight_kg: float
    reps: int
    one_rep_max: float
    achieved_at: datetime.datetime
    session_id: str | None = None

    model_config = {"from_attributes": True}


class PRByExercise(BaseModel):
    exercise: ExerciseOut
    records: list[PROut] = []


class PRWithSession(PROut):
    exercise_name: str | None = None
    session_name: str | None = None
