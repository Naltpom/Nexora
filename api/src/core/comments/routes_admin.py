"""Comments admin routes: moderation queue + policies management."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..pagination import PaginatedResponse, PaginationParams
from ..permissions import require_permission
from ..security import get_current_user
from .schemas import AdminCommentResponse, PolicyCreate, PolicyResponse
from .services import (
    approve_comment,
    delete_comment,
    delete_policy,
    list_admin_comments,
    list_policies,
    reject_comment,
    upsert_policy,
)

router = APIRouter()


# -- Moderation --

@router.get(
    "/",
    response_model=PaginatedResponse[AdminCommentResponse],
    dependencies=[Depends(require_permission("comments.moderate"))],
)
async def list_admin_comments_endpoint(
    pagination: PaginationParams = Depends(PaginationParams(
        default_per_page=25,
        default_sort_by="created_at",
        default_sort_dir="desc",
    )),
    status_filter: str = Query("", description="Filter by status (pending, approved, rejected)"),
    resource_type_filter: str = Query("", description="Filter by resource_type"),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all comments for admin moderation."""
    rows, total, pages = await list_admin_comments(
        db, pagination,
        status_filter=status_filter,
        resource_type_filter=resource_type_filter,
    )
    return PaginatedResponse(
        items=[AdminCommentResponse(**row) for row in rows],
        total=total,
        page=pagination.page,
        per_page=pagination.per_page,
        pages=pages,
    )


@router.patch(
    "/{comment_id}/approve",
    response_model=AdminCommentResponse,
    dependencies=[Depends(require_permission("comments.moderate"))],
)
async def approve_comment_endpoint(
    comment_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve a comment."""
    comment = await approve_comment(db, comment_id=comment_id, moderator_id=current_user.id)
    await db.commit()

    from .._identity.models import User
    user = await db.get(User, comment.user_id)

    return AdminCommentResponse(
        id=comment.id,
        user_id=comment.user_id,
        user_email=user.email if user else "",
        user_name=f"{user.first_name} {user.last_name}".strip() if user else "",
        resource_type=comment.resource_type,
        resource_id=comment.resource_id,
        content=comment.content,
        parent_id=comment.parent_id,
        is_edited=comment.is_edited,
        edited_at=comment.edited_at,
        deleted_at=comment.deleted_at,
        created_at=comment.created_at,
        status=comment.status,
        moderated_by_id=comment.moderated_by_id,
        moderated_by_email=current_user.email,
        moderated_at=comment.moderated_at,
    )


@router.patch(
    "/{comment_id}/reject",
    response_model=AdminCommentResponse,
    dependencies=[Depends(require_permission("comments.moderate"))],
)
async def reject_comment_endpoint(
    comment_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reject a comment."""
    comment = await reject_comment(db, comment_id=comment_id, moderator_id=current_user.id)
    await db.commit()

    from .._identity.models import User
    user = await db.get(User, comment.user_id)

    return AdminCommentResponse(
        id=comment.id,
        user_id=comment.user_id,
        user_email=user.email if user else "",
        user_name=f"{user.first_name} {user.last_name}".strip() if user else "",
        resource_type=comment.resource_type,
        resource_id=comment.resource_id,
        content=comment.content,
        parent_id=comment.parent_id,
        is_edited=comment.is_edited,
        edited_at=comment.edited_at,
        deleted_at=comment.deleted_at,
        created_at=comment.created_at,
        status=comment.status,
        moderated_by_id=comment.moderated_by_id,
        moderated_by_email=current_user.email,
        moderated_at=comment.moderated_at,
    )


@router.delete(
    "/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("comments.moderate"))],
)
async def admin_delete_comment_endpoint(
    comment_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin hard-soft-delete a comment from moderation queue."""
    await delete_comment(db, comment_id=comment_id, user_id=current_user.id, is_admin=True)
    await db.commit()


# -- Policies --

@router.get(
    "/policies",
    response_model=list[PolicyResponse],
    dependencies=[Depends(require_permission("comments.policies"))],
)
async def list_policies_endpoint(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all comment moderation policies."""
    policies = await list_policies(db)
    return [PolicyResponse(**p) for p in policies]


@router.put(
    "/policies/{resource_type}",
    response_model=PolicyResponse,
    dependencies=[Depends(require_permission("comments.policies"))],
)
async def upsert_policy_endpoint(
    resource_type: str,
    body: PolicyCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update a comment moderation policy."""
    policy = await upsert_policy(
        db,
        resource_type=resource_type,
        requires_moderation=body.requires_moderation,
        user_id=current_user.id,
    )
    await db.commit()
    return PolicyResponse(
        resource_type=policy.resource_type,
        requires_moderation=policy.requires_moderation,
        updated_at=policy.updated_at,
        updated_by_id=policy.updated_by_id,
    )


@router.delete(
    "/policies/{resource_type}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("comments.policies"))],
)
async def delete_policy_endpoint(
    resource_type: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a comment moderation policy."""
    await delete_policy(db, resource_type=resource_type, user_id=current_user.id)
    await db.commit()
