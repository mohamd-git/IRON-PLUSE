"""
Community router — WebSocket, Posts / Feed, Likes, Comments.

WS   /ws/{user_id}?token=JWT      — real-time events
GET  /posts                        — cursor-based feed
POST /posts                        — create post
DELETE /posts/{id}                  — own post only
POST /posts/{id}/like              — toggle like
GET  /posts/{id}/comments          — paginated
POST /posts/{id}/comments          — create + notify
"""

import logging

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy import and_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.security import decode_token
from app.core.websocket import manager
from app.database import get_db
from app.dependencies import get_current_user
from app.models.community import (
    Comment,
    Notification,
    NotificationType,
    Post,
    PostLike,
    PostType,
)
from app.models.user import User
from app.schemas.community import (
    AuthorBrief,
    CommentCreate,
    CommentOut,
    PostCreate,
    PostFeedResponse,
    PostOut,
)

logger = logging.getLogger("ironpulse.community")

router = APIRouter(tags=["Community"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  WebSocket — /ws/{user_id}?token=JWT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """
    Authenticate via query param `token`, connect to the
    ConnectionManager, and keep alive until disconnect.
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    try:
        payload = decode_token(token)
        if payload.get("sub") != user_id or payload.get("type") != "access":
            await websocket.close(code=4003, reason="Invalid token")
            return
    except JWTError:
        await websocket.close(code=4003, reason="Invalid token")
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            # Keep connection alive — client may send pings / heartbeats
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Helpers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _author_brief(user: User) -> AuthorBrief:
    return AuthorBrief(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
    )


async def _enrich_post(
    post: Post, current_user_id: str, db: AsyncSession
) -> PostOut:
    """Add author info and like status to a post."""
    # Fetch author
    author_result = await db.execute(
        select(User).where(User.id == post.user_id)
    )
    author = author_result.scalar_one_or_none()

    # Check if current user has liked
    like_result = await db.execute(
        select(PostLike).where(
            and_(PostLike.post_id == post.id, PostLike.user_id == current_user_id)
        )
    )
    is_liked = like_result.scalar_one_or_none() is not None

    return PostOut(
        id=post.id,
        user_id=post.user_id,
        content=post.content,
        post_type=post.post_type.value if isinstance(post.post_type, PostType) else post.post_type,
        media_urls=post.media_urls,
        workout_session_id=post.workout_session_id,
        pr_id=post.pr_id,
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        is_visible=post.is_visible,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=_author_brief(author) if author else None,
        is_liked_by_me=is_liked,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /posts — cursor-based feed
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/posts", response_model=PostFeedResponse)
async def get_feed(
    cursor: str | None = Query(None, description="Last post ID for cursor pagination"),
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cursor-based paginated feed.
    Pass `cursor=<last_post_id>` to load older posts.
    """
    query = (
        select(Post)
        .where(Post.is_visible.is_(True))
        .order_by(Post.created_at.desc())
    )

    if cursor:
        # Fetch the cursor post's created_at for keyset pagination
        cursor_result = await db.execute(
            select(Post.created_at).where(Post.id == cursor)
        )
        cursor_ts = cursor_result.scalar_one_or_none()
        if cursor_ts:
            query = query.where(Post.created_at < cursor_ts)

    query = query.limit(limit + 1)  # fetch one extra to detect next page
    result = await db.execute(query)
    posts = list(result.scalars().all())

    has_next = len(posts) > limit
    if has_next:
        posts = posts[:limit]

    enriched = [await _enrich_post(p, user.id, db) for p in posts]
    next_cursor = posts[-1].id if has_next and posts else None

    return PostFeedResponse(posts=enriched, next_cursor=next_cursor)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /posts
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/posts", response_model=PostOut, status_code=201)
async def create_post(
    data: PostCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = Post(
        user_id=user.id,
        content=data.content,
        post_type=data.post_type,
        media_urls=data.media_urls or None,
        workout_session_id=data.workout_session_id,
        pr_id=data.pr_id,
    )
    db.add(post)
    await db.flush()
    await db.refresh(post)
    return await _enrich_post(post, user.id, db)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  DELETE /posts/{id}
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.delete("/posts/{post_id}", status_code=204)
async def delete_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise NotFoundError("Post")
    if post.user_id != user.id:
        raise ForbiddenError("Cannot delete another user's post")
    await db.delete(post)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /posts/{id}/like — toggle
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/posts/{post_id}/like")
async def toggle_like(
    post_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle like: if already liked → unlike, else → like + notify."""
    post_result = await db.execute(select(Post).where(Post.id == post_id))
    post = post_result.scalar_one_or_none()
    if not post:
        raise NotFoundError("Post")

    like_result = await db.execute(
        select(PostLike).where(
            and_(PostLike.post_id == post_id, PostLike.user_id == user.id)
        )
    )
    existing = like_result.scalar_one_or_none()

    if existing:
        # Unlike
        await db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        await db.flush()
        return {"action": "unliked", "likes_count": post.likes_count}
    else:
        # Like
        like = PostLike(post_id=post_id, user_id=user.id)
        db.add(like)
        post.likes_count += 1
        await db.flush()

        # Notify post owner (if not self-like)
        if post.user_id != user.id:
            notification = Notification(
                user_id=post.user_id,
                notification_type=NotificationType.social,
                title="Post liked ❤️",
                body=f"{user.display_name} liked your post",
                metadata_json={
                    "post_id": post_id,
                    "liker_id": user.id,
                    "liker_username": user.username,
                },
            )
            db.add(notification)
            await db.flush()

            # WebSocket event
            await manager.send_to_user(
                post.user_id,
                "post_liked",
                {
                    "post_id": post_id,
                    "liker_id": user.id,
                    "liker_username": user.username,
                    "liker_display_name": user.display_name,
                    "likes_count": post.likes_count,
                },
            )

        return {"action": "liked", "likes_count": post.likes_count}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GET /posts/{id}/comments
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/posts/{post_id}/comments", response_model=list[CommentOut])
async def list_comments(
    post_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Comment)
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    comments = list(result.scalars().all())

    out: list[CommentOut] = []
    for c in comments:
        author_result = await db.execute(
            select(User).where(User.id == c.user_id)
        )
        author = author_result.scalar_one_or_none()
        out.append(
            CommentOut(
                id=c.id,
                post_id=c.post_id,
                user_id=c.user_id,
                content=c.content,
                created_at=c.created_at,
                author=_author_brief(author) if author else None,
            )
        )
    return out


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  POST /posts/{id}/comments
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=201)
async def create_comment(
    post_id: str,
    data: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify post exists
    post_result = await db.execute(select(Post).where(Post.id == post_id))
    post = post_result.scalar_one_or_none()
    if not post:
        raise NotFoundError("Post")

    comment = Comment(
        post_id=post_id,
        user_id=user.id,
        content=data.content,
    )
    db.add(comment)
    post.comments_count += 1
    await db.flush()
    await db.refresh(comment)

    # Notify post owner
    if post.user_id != user.id:
        notification = Notification(
            user_id=post.user_id,
            notification_type=NotificationType.social,
            title="New comment 💬",
            body=f"{user.display_name} commented on your post",
            metadata_json={
                "post_id": post_id,
                "comment_id": comment.id,
                "commenter_id": user.id,
            },
        )
        db.add(notification)
        await db.flush()

    return CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        content=comment.content,
        created_at=comment.created_at,
        author=_author_brief(user),
    )
