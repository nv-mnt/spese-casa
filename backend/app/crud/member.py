from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.member import Member
from app.schemas.member import MemberUpdate


async def list_members(db: AsyncSession, household_id: int) -> list[Member]:
    res = await db.execute(
        select(Member).where(Member.household_id == household_id).order_by(Member.id)
    )
    return list(res.scalars().all())


async def get_member(db: AsyncSession, household_id: int, member_id: int) -> Member | None:
    res = await db.execute(
        select(Member).where(Member.id == member_id, Member.household_id == household_id)
    )
    return res.scalar_one_or_none()


async def update_member(db: AsyncSession, member: Member, payload: MemberUpdate) -> Member:
    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    if "nome" in data:
        member.nome = data["nome"].strip()
    if "colore" in data:
        member.colore = data["colore"]
    await db.flush()
    await db.refresh(member)
    return member
