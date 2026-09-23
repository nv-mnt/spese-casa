from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.recurring import RecurringExpenseTemplate
from app.schemas.recurring import RecurringTemplateCreate, RecurringTemplateUpdate


async def list_templates(
    db: AsyncSession, household_id: int, *, only_active: bool = False
) -> list[RecurringExpenseTemplate]:
    stmt = select(RecurringExpenseTemplate).where(
        RecurringExpenseTemplate.household_id == household_id
    )
    if only_active:
        stmt = stmt.where(RecurringExpenseTemplate.attivo.is_(True))
    stmt = stmt.order_by(RecurringExpenseTemplate.ordine, RecurringExpenseTemplate.id)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_template(
    db: AsyncSession, household_id: int, template_id: int
) -> RecurringExpenseTemplate | None:
    res = await db.execute(
        select(RecurringExpenseTemplate).where(
            RecurringExpenseTemplate.id == template_id,
            RecurringExpenseTemplate.household_id == household_id,
        )
    )
    return res.scalar_one_or_none()


async def create_template(
    db: AsyncSession, household_id: int, payload: RecurringTemplateCreate
) -> RecurringExpenseTemplate:
    tpl = RecurringExpenseTemplate(household_id=household_id, **payload.model_dump())
    db.add(tpl)
    await db.flush()
    await db.refresh(tpl)
    return tpl


async def update_template(
    db: AsyncSession, tpl: RecurringExpenseTemplate, payload: RecurringTemplateUpdate
) -> RecurringExpenseTemplate:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tpl, field, value)
    await db.flush()
    await db.refresh(tpl)
    return tpl


async def delete_template(db: AsyncSession, tpl: RecurringExpenseTemplate) -> None:
    await db.delete(tpl)
    await db.flush()
