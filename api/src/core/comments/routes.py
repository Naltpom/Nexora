"""Comments feature routes."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..events import event_bus
from ..pagination import PaginatedResponse, PaginationParams
from ..permissions import load_user_permissions, require_permission
from ..security import get_current_user
from .schemas import CommentCreate, CommentResponse, CommentUpdate, MentionUserFullResponse, MentionUserResponse
from .services import (
    create_comment,
    delete_comment,
    list_comments,
    list_mentionable_users,
    search_mentionable_users,
    update_comment,
)

router = APIRouter()


@router.get(
    "/",
    response_model=PaginatedResponse[CommentResponse],
    dependencies=[Depends(require_permission("comments.read"))],
)
async def list_comments_endpoint(
    pagination: PaginationParams = Depends(PaginationParams(
        default_per_page=25,
        default_sort_by="created_at",
        default_sort_dir="asc",
    )),
    resource_type: str = Query(..., description="Resource type"),
    resource_id: int = Query(..., description="Resource ID"),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List comments for a specific resource."""
    rows, total, pages = await list_comments(
        db, pagination,
        resource_type=resource_type,
        resource_id=resource_id,
        current_user_id=current_user.id,
    )
    return PaginatedResponse(
        items=[CommentResponse(**row) for row in rows],
        total=total,
        page=pagination.page,
        per_page=pagination.per_page,
        pages=pages,
    )


@router.post(
    "/",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("comments.create"))],
)
async def create_comment_endpoint(
    body: CommentCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new comment."""
    comment = await create_comment(
        db,
        user_id=current_user.id,
        resource_type=body.resource_type,
        resource_id=body.resource_id,
        content=body.content,
        parent_id=body.parent_id,
    )
    await db.commit()
    await event_bus.emit(
        "comments.created", db=db, actor_id=current_user.id,
        resource_type=comment.resource_type, resource_id=comment.resource_id,
        payload={"comment_id": comment.id, "parent_id": comment.parent_id},
    )

    return CommentResponse(
        id=comment.id,
        user_id=comment.user_id,
        user_email=current_user.email,
        user_name=f"{current_user.first_name} {current_user.last_name}".strip(),
        resource_type=comment.resource_type,
        resource_id=comment.resource_id,
        content=comment.content,
        parent_id=comment.parent_id,
        is_edited=comment.is_edited,
        edited_at=comment.edited_at,
        deleted_at=comment.deleted_at,
        created_at=comment.created_at,
        status=comment.status,
    )


@router.patch(
    "/{comment_id}",
    response_model=CommentResponse,
    dependencies=[Depends(require_permission("comments.update"))],
)
async def update_comment_endpoint(
    comment_id: int,
    body: CommentUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing comment."""
    user_perms = await load_user_permissions(db, current_user.id)
    is_admin = user_perms.get("comments.admin") is True

    comment = await update_comment(
        db,
        comment_id=comment_id,
        user_id=current_user.id,
        content=body.content,
        is_admin=is_admin,
    )
    await db.commit()
    await event_bus.emit(
        "comments.updated", db=db, actor_id=current_user.id,
        resource_type=comment.resource_type, resource_id=comment.resource_id,
        payload={"comment_id": comment.id},
    )

    from .._identity.models import User
    user = await db.get(User, comment.user_id)

    return CommentResponse(
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
    )


@router.delete(
    "/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("comments.delete"))],
)
async def delete_comment_endpoint(
    comment_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a comment."""
    user_perms = await load_user_permissions(db, current_user.id)
    is_admin = user_perms.get("comments.admin") is True

    await delete_comment(
        db,
        comment_id=comment_id,
        user_id=current_user.id,
        is_admin=is_admin,
    )
    await db.commit()
    await event_bus.emit(
        "comments.deleted", db=db, actor_id=current_user.id,
        resource_type="comment", resource_id=comment_id,
        payload={"comment_id": comment_id},
    )


@router.get(
    "/mentions/search",
    response_model=list[MentionUserResponse],
    dependencies=[Depends(require_permission("comments.create"))],
)
async def search_mentions_endpoint(
    q: str = Query("", min_length=1, max_length=100, description="Search query"),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search users for @mention autocomplete."""
    users = await search_mentionable_users(db, query_str=q)
    return [MentionUserResponse(**u) for u in users]


@router.get(
    "/mentions/list",
    response_model=list[MentionUserFullResponse],
    dependencies=[Depends(require_permission("comments.create"))],
)
async def list_mentions_endpoint(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List active users for RichTextEditor @mention pre-loading."""
    users = await list_mentionable_users(db)
    return [MentionUserFullResponse(**u) for u in users]
