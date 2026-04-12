"""
Community models — Post, Comment, PostLike, BattleChallenge, Message, Notification.
All IDs are UUID strings.  Async-compatible via app.database.Base.
"""

import enum
import uuid
import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum, Integer, JSON, String, Text, ForeignKey, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ── Enums ─────────────────────────────────────────────
class PostType(str, enum.Enum):
    general = "general"
    pr = "pr"
    workout_log = "workout_log"
    physique = "physique"
    challenge = "challenge"


class ChallengeStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    completed = "completed"
    declined = "declined"


class MessageType(str, enum.Enum):
    text = "text"
    workout_share = "workout_share"
    pr_share = "pr_share"


class NotificationType(str, enum.Enum):
    pr = "pr"
    challenge = "challenge"
    social = "social"
    system = "system"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Post
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class Post(Base):
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    post_type: Mapped[PostType] = mapped_column(
        Enum(PostType, name="post_type", native_enum=False),
        default=PostType.general,
    )
    media_urls: Mapped[list | None] = mapped_column(JSON, nullable=True)
    workout_session_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("workout_sessions.id"), nullable=True
    )
    pr_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("personal_records.id"), nullable=True
    )
    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    comments_count: Mapped[int] = mapped_column(Integer, default=0)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ── Relationships ─────────────────────────────────
    user = relationship("User", back_populates="posts")
    comments = relationship(
        "Comment", back_populates="post", lazy="selectin",
        cascade="all, delete-orphan",
    )
    likes = relationship(
        "PostLike", back_populates="post", lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Post {self.id[:8]} ({self.post_type.value})>"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Comment
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    post_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("posts.id"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────
    post = relationship("Post", back_populates="comments")

    def __repr__(self) -> str:
        return f"<Comment {self.id[:8]}>"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  PostLike
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class PostLike(Base):
    __tablename__ = "post_likes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    post_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("posts.id"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────
    post = relationship("Post", back_populates="likes")

    def __repr__(self) -> str:
        return f"<PostLike post={self.post_id[:8]} user={self.user_id[:8]}>"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  BattleChallenge
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class BattleChallenge(Base):
    __tablename__ = "battle_challenges"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    challenger_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    challenged_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    exercise_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("exercises.id"), nullable=False
    )
    target_weight_kg: Mapped[float | None] = mapped_column(nullable=True)
    target_reps: Mapped[int | None] = mapped_column(nullable=True)
    status: Mapped[ChallengeStatus] = mapped_column(
        Enum(ChallengeStatus, name="challenge_status", native_enum=False),
        default=ChallengeStatus.pending,
    )
    expires_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<BattleChallenge {self.id[:8]} ({self.status.value})>"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Message  (DMs)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    sender_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    recipient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[MessageType] = mapped_column(
        Enum(MessageType, name="message_type", native_enum=False),
        default=MessageType.text,
    )
    metadata_json: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )  # renamed from 'metadata' to avoid SQLAlchemy reserved attr
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<Message {self.sender_id[:8]}→{self.recipient_id[:8]}>"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Notification
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type", native_enum=False),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────
    user = relationship("User", back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification {self.notification_type.value} → {self.user_id[:8]}>"
