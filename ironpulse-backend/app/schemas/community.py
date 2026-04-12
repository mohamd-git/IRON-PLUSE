"""
Community schemas — posts, comments, challenges, messages, notifications.
"""

import datetime
from pydantic import BaseModel, Field


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Author snippet (embedded in post / comment / message)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class AuthorBrief(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: str | None = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Posts
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class PostCreate(BaseModel):
    content: str
    post_type: str = "general"
    media_urls: list[str] = []
    workout_session_id: str | None = None
    pr_id: str | None = None


class PostOut(BaseModel):
    id: str
    user_id: str
    content: str
    post_type: str
    media_urls: list | None = None
    workout_session_id: str | None = None
    pr_id: str | None = None
    likes_count: int = 0
    comments_count: int = 0
    is_visible: bool = True
    created_at: datetime.datetime
    updated_at: datetime.datetime
    # Enriched fields
    author: AuthorBrief | None = None
    is_liked_by_me: bool = False

    model_config = {"from_attributes": True}


class PostFeedResponse(BaseModel):
    posts: list[PostOut]
    next_cursor: str | None = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Comments
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class CommentCreate(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: str
    post_id: str
    user_id: str
    content: str
    created_at: datetime.datetime
    author: AuthorBrief | None = None

    model_config = {"from_attributes": True}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Battle Challenges
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class ChallengeCreate(BaseModel):
    challenged_id: str
    exercise_id: str
    target_weight_kg: float | None = None
    target_reps: int | None = None
    expires_hours: int = 48


class ChallengeOut(BaseModel):
    id: str
    challenger_id: str
    challenged_id: str
    exercise_id: str
    target_weight_kg: float | None = None
    target_reps: int | None = None
    status: str
    expires_at: datetime.datetime | None = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Messages / DMs
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    metadata_json: dict | None = None


class MessageOut(BaseModel):
    id: str
    sender_id: str
    recipient_id: str
    content: str
    message_type: str
    metadata_json: dict | None = None
    is_read: bool = False
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    partner_id: str
    partner_username: str
    partner_display_name: str
    partner_avatar_url: str | None = None
    last_message: MessageOut
    unread_count: int = 0


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Notifications (Signals)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class NotificationOut(BaseModel):
    id: str
    user_id: str
    notification_type: str
    title: str
    body: str | None = None
    metadata_json: dict | None = None
    is_read: bool = False
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class SignalFeedResponse(BaseModel):
    notifications: list[NotificationOut]
    unread_count: int = 0


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Partner Discovery
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class PartnerCandidate(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: str | None = None
    experience_level: str | None = None
    primary_goal: str | None = None
    training_days_per_week: int = 3
    current_streak: int = 0
    compatibility_score: int = 0
