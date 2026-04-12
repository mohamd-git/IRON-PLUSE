"""
Models package — re-exports every ORM model for Alembic auto-detection.
"""

# ── User ──────────────────────────────────────────────
from app.models.user import User, UserRole, ExperienceLevel, PrimaryGoal  # noqa: F401

# ── Workout ───────────────────────────────────────────
from app.models.workout import (  # noqa: F401
    Exercise,
    WorkoutTemplate,
    WorkoutSession,
    WorkoutSet,
    PersonalRecord,
    Difficulty,
    SessionStatus,
)

# ── Community ─────────────────────────────────────────
from app.models.community import (  # noqa: F401
    Post,
    Comment,
    PostLike,
    BattleChallenge,
    Message,
    Notification,
    PostType,
    ChallengeStatus,
    MessageType,
    NotificationType,
)

# ── VIP ───────────────────────────────────────────────
from app.models.vip import (  # noqa: F401
    VIPSubscription,
    VIPLoungeMessage,
    VIPPlan,
    VIPStatus,
)

# ── Payment ───────────────────────────────────────────
from app.models.payment import (  # noqa: F401
    Payment,
    PaymentMethod,
    PaymentProvider,
    PaymentStatus,
    PaymentPlan,
)

# ── Gym / Body tracking ──────────────────────────────
from app.models.gym import Gym, PhysiqueLog, BodyMeasurement  # noqa: F401
