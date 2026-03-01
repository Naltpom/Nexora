"""Mass fixture generator for comments and comment policies."""

from datetime import datetime, timedelta, timezone
from typing import Any

from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession

from ..fixture_registry import FixtureContext, FixtureDefinition
from .models import Comment, CommentPolicy

fake = Faker("fr_FR")

# Resource types for polymorphic comments
RESOURCE_TYPES = ["ticket", "document", "article", "task", "project"]

# Realistic comment content templates (FR)
COMMENT_TEMPLATES = [
    "Bonne idee, je suis d'accord avec cette approche.",
    "Est-ce qu'on pourrait revoir ce point en reunion ?",
    "J'ai mis a jour le document avec les derniers chiffres.",
    "Attention, il y a une erreur dans le calcul du total.",
    "@{name} peux-tu verifier ce point stp ?",
    "Je pense qu'il faudrait ajouter une section sur la conformite.",
    "Tres bien, c'est valide de mon cote.",
    "Il manque les donnees du Q4, je les ajoute demain.",
    "Merci pour la correction, c'est beaucoup plus clair maintenant.",
    "Je propose de decaler la deadline d'une semaine.",
    "Le client a valide la maquette, on peut avancer.",
    "Il faudrait ajouter des tests unitaires pour cette fonctionnalite.",
    "Super travail sur cette version, bravo a l'equipe !",
    "Je ne suis pas sur que cette solution soit optimale.",
    "On devrait planifier une revue de code avant le merge.",
]

REPLY_TEMPLATES = [
    "D'accord, je m'en occupe.",
    "Merci pour le retour !",
    "Bien note, je fais les modifications.",
    "Je suis d'accord avec @{name}.",
    "C'est fait, tu peux verifier.",
    "OK, je regarde ca cet apres-midi.",
]


async def _generate_comments(db: AsyncSession, ctx: FixtureContext) -> dict[str, Any]:
    """Generate mass comments spread over the last 60 days."""
    scale = ctx.scale
    user_ids = ctx.user_ids
    admin_id = ctx.admin_id or (user_ids[0] if user_ids else None)

    if not user_ids:
        return {"error": "No user IDs available. _identity fixtures must run first."}

    now = datetime.now(timezone.utc)
    total_root = scale * 3  # ~3 root comments per scale unit

    root_comments: list[Comment] = []
    all_comments: list[Comment] = []

    # Statuses distribution: 70% approved, 20% pending, 10% rejected
    statuses = (
        ["approved"] * 7
        + ["pending"] * 2
        + ["rejected"] * 1
    )

    # Generate root comments
    for _ in range(total_root):
        user_id = fake.random_element(user_ids)
        resource_type = fake.random_element(RESOURCE_TYPES)
        resource_id = fake.random_int(min=1, max=50)
        template = fake.random_element(COMMENT_TEMPLATES)
        content = template.replace("{name}", fake.first_name())

        days_ago = fake.random_int(min=0, max=60)
        hours_ago = fake.random_int(min=0, max=23)

        status = fake.random_element(statuses)
        moderated_by_id = None
        moderated_at = None
        if status in ("approved", "rejected"):
            moderated_by_id = admin_id
            moderated_at = now - timedelta(days=max(0, days_ago - 1), hours=hours_ago)

        is_edited = fake.random_int(min=0, max=9) == 0  # 10% edited

        comment = Comment(
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            content=content,
            parent_id=None,
            is_edited=is_edited,
            edited_at=(now - timedelta(days=max(0, days_ago - 1))) if is_edited else None,
            status=status,
            moderated_by_id=moderated_by_id,
            moderated_at=moderated_at,
            created_at=now - timedelta(days=days_ago, hours=hours_ago),
        )
        db.add(comment)
        root_comments.append(comment)
        all_comments.append(comment)

    await db.flush()

    # Generate replies (~30% of root comments get 1-3 replies)
    replies_created = 0
    for root in root_comments:
        if fake.random_int(min=0, max=9) > 2:  # 30% chance
            continue

        num_replies = fake.random_int(min=1, max=3)
        for _ in range(num_replies):
            user_id = fake.random_element(user_ids)
            template = fake.random_element(REPLY_TEMPLATES)
            content = template.replace("{name}", fake.first_name())

            reply = Comment(
                user_id=user_id,
                resource_type=root.resource_type,
                resource_id=root.resource_id,
                content=content,
                parent_id=root.id,
                status="approved",
                moderated_by_id=admin_id,
                moderated_at=root.created_at + timedelta(hours=fake.random_int(min=1, max=48)),
                created_at=root.created_at + timedelta(hours=fake.random_int(min=1, max=72)),
            )
            db.add(reply)
            all_comments.append(reply)
            replies_created += 1

    await db.flush()

    ctx.set("comments.comment_ids", [c.id for c in all_comments])

    return {
        "root_comments_created": len(root_comments),
        "replies_created": replies_created,
        "total": len(all_comments),
        "resource_types_used": len(RESOURCE_TYPES),
        "date_range_days": 60,
    }


async def _generate_policies(db: AsyncSession, ctx: FixtureContext) -> dict[str, Any]:
    """Generate comment policies for all resource types."""
    admin_id = ctx.admin_id or (ctx.user_ids[0] if ctx.user_ids else None)
    now = datetime.now(timezone.utc)

    policies_created = 0
    for rt in RESOURCE_TYPES:
        # ticket and document require moderation, others don't
        requires_mod = rt in ("ticket", "document")
        policy = CommentPolicy(
            resource_type=rt,
            requires_moderation=requires_mod,
            updated_at=now - timedelta(days=fake.random_int(min=1, max=30)),
            updated_by_id=admin_id,
        )
        db.add(policy)
        policies_created += 1

    await db.flush()

    return {
        "policies_created": policies_created,
        "with_moderation": 2,
        "without_moderation": policies_created - 2,
    }


fixtures = [
    FixtureDefinition(
        name="comments",
        label="Comments",
        description="Generate mass polymorphic comments (root + replies, various statuses)",
        depends=["_identity"],
        handler=_generate_comments,
        check_table="comments",
        check_min_rows=50,
    ),
    FixtureDefinition(
        name="comment_policies",
        label="Comment Policies",
        description="Generate moderation policies per resource type",
        depends=["_identity"],
        handler=_generate_policies,
        check_table="comment_policies",
        check_min_rows=3,
    ),
]
