"""Comments feature services."""

from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .._identity.models import User
from ..event.services import persist_event
from ..pagination import PaginationParams, paginate, search_like_pattern
from .models import Comment, CommentPolicy


async def list_comments(
    db: AsyncSession,
    pagination: PaginationParams,
    *,
    resource_type: str,
    resource_id: int,
    current_user_id: int | None = None,
) -> tuple[list[dict], int, int]:
    """List comments for a resource with pagination.

    Shows approved comments + the current user's own pending comments.
    """
    query = (
        select(Comment, User)
        .join(User, Comment.user_id == User.id)
        .where(
            Comment.resource_type == resource_type,
            Comment.resource_id == resource_id,
            Comment.deleted_at.is_(None),
        )
    )

    # Status filter: approved + own pending
    if current_user_id is not None:
        query = query.where(
            or_(
                Comment.status == "approved",
                (Comment.user_id == current_user_id) & (Comment.status == "pending"),
            )
        )
    else:
        query = query.where(Comment.status == "approved")

    if pagination.search:
        like = search_like_pattern(pagination.search)
        query = query.where(
            or_(
                Comment.content.ilike(like),
                User.email.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
            )
        )

    sort_whitelist = {
        "created_at": Comment.created_at,
    }
    result, total, pages = await paginate(
        db, query, pagination,
        sort_whitelist=sort_whitelist,
        default_sort_column=Comment.created_at,
    )

    rows = []
    for comment, user in result.all():
        rows.append({
            "id": comment.id,
            "user_id": comment.user_id,
            "user_email": user.email,
            "user_name": f"{user.first_name} {user.last_name}".strip(),
            "resource_type": comment.resource_type,
            "resource_id": comment.resource_id,
            "content": comment.content,
            "parent_id": comment.parent_id,
            "is_edited": comment.is_edited,
            "edited_at": comment.edited_at,
            "deleted_at": comment.deleted_at,
            "created_at": comment.created_at,
            "status": comment.status,
        })

    return rows, total, pages


async def create_comment(
    db: AsyncSession,
    *,
    user_id: int,
    resource_type: str,
    resource_id: int,
    content: str,
    parent_id: int | None = None,
) -> Comment:
    """Create a new comment. Checks CommentPolicy for moderation requirement."""
    if parent_id is not None:
        parent = await db.get(Comment, parent_id)
        if (
            parent is None
            or parent.deleted_at is not None
            or parent.resource_type != resource_type
            or parent.resource_id != resource_id
        ):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Parent comment not found")

    # Determine status based on policy
    status = "approved"
    policy = await db.get(CommentPolicy, resource_type)
    if policy and policy.requires_moderation:
        status = "pending"

    comment = Comment(
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        content=content,
        parent_id=parent_id,
        status=status,
    )
    db.add(comment)
    await db.flush()

    await persist_event(
        db,
        event_type="comments.created",
        actor_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        payload={"comment_id": comment.id, "content": content[:200], "status": status},
    )

    return comment


async def update_comment(
    db: AsyncSession,
    *,
    comment_id: int,
    user_id: int,
    content: str,
    is_admin: bool = False,
) -> Comment:
    """Update a comment. Only the author or an admin can edit."""
    comment = await db.get(Comment, comment_id)
    if comment is None or comment.deleted_at is not None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != user_id and not is_admin:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Cannot edit another user's comment")

    comment.content = content
    comment.is_edited = True
    comment.edited_at = datetime.now(timezone.utc)
    await db.flush()

    await persist_event(
        db,
        event_type="comments.updated",
        actor_id=user_id,
        resource_type=comment.resource_type,
        resource_id=comment.resource_id,
        payload={"comment_id": comment.id, "content": content[:200]},
    )

    return comment


async def delete_comment(
    db: AsyncSession,
    *,
    comment_id: int,
    user_id: int,
    is_admin: bool = False,
) -> None:
    """Soft-delete a comment. Only the author or an admin can delete."""
    comment = await db.get(Comment, comment_id)
    if comment is None or comment.deleted_at is not None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != user_id and not is_admin:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Cannot delete another user's comment")

    comment.deleted_at = datetime.now(timezone.utc)
    await db.flush()

    await persist_event(
        db,
        event_type="comments.deleted",
        actor_id=user_id,
        resource_type=comment.resource_type,
        resource_id=comment.resource_id,
        payload={"comment_id": comment.id},
    )


async def search_mentionable_users(
    db: AsyncSession,
    *,
    query_str: str,
    limit: int = 10,
) -> list[dict]:
    """Search active users for @mention autocomplete."""
    like = search_like_pattern(query_str)
    q = (
        select(User)
        .where(
            User.is_active == True,  # noqa: E712
            or_(
                User.email.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
            ),
        )
        .limit(limit)
    )
    result = await db.execute(q)
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "email": u.email,
            "name": f"{u.first_name} {u.last_name}".strip(),
        }
        for u in users
    ]


async def list_mentionable_users(
    db: AsyncSession,
    *,
    limit: int = 100,
) -> list[dict]:
    """List active users for @mention pre-loading (RichTextEditor)."""
    q = (
        select(User)
        .where(User.is_active == True)  # noqa: E712
        .order_by(User.first_name, User.last_name)
        .limit(limit)
    )
    result = await db.execute(q)
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "first_name": u.first_name or "",
            "last_name": u.last_name or "",
            "email": u.email,
        }
        for u in users
    ]


# -- Admin moderation services --

async def list_admin_comments(
    db: AsyncSession,
    pagination: PaginationParams,
    *,
    status_filter: str = "",
    resource_type_filter: str = "",
) -> tuple[list[dict], int, int]:
    """List all comments for admin moderation with filters."""
    moderator = User.__table__.alias("moderator")
    query = (
        select(Comment, User, moderator.c.email.label("mod_email"))
        .join(User, Comment.user_id == User.id)
        .outerjoin(moderator, Comment.moderated_by_id == moderator.c.id)
        .where(Comment.deleted_at.is_(None))
    )

    if status_filter:
        query = query.where(Comment.status == status_filter)
    if resource_type_filter:
        query = query.where(Comment.resource_type == resource_type_filter)

    if pagination.search:
        like = search_like_pattern(pagination.search)
        query = query.where(
            or_(
                Comment.content.ilike(like),
                User.email.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
            )
        )

    sort_whitelist = {
        "created_at": Comment.created_at,
        "status": Comment.status,
    }
    result, total, pages = await paginate(
        db, query, pagination,
        sort_whitelist=sort_whitelist,
        default_sort_column=Comment.created_at,
    )

    rows = []
    for comment, user, mod_email in result.all():
        rows.append({
            "id": comment.id,
            "user_id": comment.user_id,
            "user_email": user.email,
            "user_name": f"{user.first_name} {user.last_name}".strip(),
            "resource_type": comment.resource_type,
            "resource_id": comment.resource_id,
            "content": comment.content,
            "parent_id": comment.parent_id,
            "is_edited": comment.is_edited,
            "edited_at": comment.edited_at,
            "deleted_at": comment.deleted_at,
            "created_at": comment.created_at,
            "status": comment.status,
            "moderated_by_id": comment.moderated_by_id,
            "moderated_by_email": mod_email,
            "moderated_at": comment.moderated_at,
        })

    return rows, total, pages


async def approve_comment(
    db: AsyncSession,
    *,
    comment_id: int,
    moderator_id: int,
) -> Comment:
    """Approve a pending comment."""
    comment = await db.get(Comment, comment_id)
    if comment is None or comment.deleted_at is not None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Comment not found")

    comment.status = "approved"
    comment.moderated_by_id = moderator_id
    comment.moderated_at = datetime.now(timezone.utc)
    await db.flush()

    await persist_event(
        db,
        event_type="comments.approved",
        actor_id=moderator_id,
        resource_type=comment.resource_type,
        resource_id=comment.resource_id,
        payload={"comment_id": comment.id, "moderator_id": moderator_id},
    )

    return comment


async def reject_comment(
    db: AsyncSession,
    *,
    comment_id: int,
    moderator_id: int,
) -> Comment:
    """Reject a pending comment."""
    comment = await db.get(Comment, comment_id)
    if comment is None or comment.deleted_at is not None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Comment not found")

    comment.status = "rejected"
    comment.moderated_by_id = moderator_id
    comment.moderated_at = datetime.now(timezone.utc)
    await db.flush()

    await persist_event(
        db,
        event_type="comments.rejected",
        actor_id=moderator_id,
        resource_type=comment.resource_type,
        resource_id=comment.resource_id,
        payload={"comment_id": comment.id, "moderator_id": moderator_id},
    )

    return comment


# -- Policy services --

async def list_policies(db: AsyncSession) -> list[dict]:
    """List all comment moderation policies."""
    result = await db.execute(
        select(CommentPolicy).order_by(CommentPolicy.resource_type)
    )
    policies = result.scalars().all()
    return [
        {
            "resource_type": p.resource_type,
            "requires_moderation": p.requires_moderation,
            "updated_at": p.updated_at,
            "updated_by_id": p.updated_by_id,
        }
        for p in policies
    ]


async def upsert_policy(
    db: AsyncSession,
    *,
    resource_type: str,
    requires_moderation: bool,
    user_id: int,
) -> CommentPolicy:
    """Create or update a comment policy."""
    policy = await db.get(CommentPolicy, resource_type)
    is_new = policy is None

    if is_new:
        policy = CommentPolicy(
            resource_type=resource_type,
            requires_moderation=requires_moderation,
            updated_at=datetime.now(timezone.utc),
            updated_by_id=user_id,
        )
        db.add(policy)
    else:
        policy.requires_moderation = requires_moderation
        policy.updated_at = datetime.now(timezone.utc)
        policy.updated_by_id = user_id

    await db.flush()

    event_type = "comments.policy_created" if is_new else "comments.policy_updated"
    await persist_event(
        db,
        event_type=event_type,
        actor_id=user_id,
        resource_type="comment_policy",
        resource_id=0,
        payload={"resource_type": resource_type, "requires_moderation": requires_moderation},
    )

    return policy


async def delete_policy(
    db: AsyncSession,
    *,
    resource_type: str,
    user_id: int,
) -> None:
    """Delete a comment policy."""
    policy = await db.get(CommentPolicy, resource_type)
    if policy is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Policy not found")

    await db.delete(policy)
    await db.flush()

    await persist_event(
        db,
        event_type="comments.policy_deleted",
        actor_id=user_id,
        resource_type="comment_policy",
        resource_id=0,
        payload={"resource_type": resource_type},
    )
