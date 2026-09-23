"""Modello configurabile delle spese fisse ricorrenti."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Response, status

from app.api.deps import CurrentUser, DbSession, validate_member_id
from app.crud import recurring as crud_recurring
from app.models.recurring import RecurringExpenseTemplate
from app.schemas.recurring import (
    RecurringTemplateCreate,
    RecurringTemplateOut,
    RecurringTemplateUpdate,
)

router = APIRouter(prefix="/recurring-templates", tags=["recurring"])


@router.get("", response_model=list[RecurringTemplateOut], summary="Elenca le spese fisse")
async def list_templates(
    db: DbSession, user: CurrentUser, only_active: bool = False
) -> list[RecurringExpenseTemplate]:
    return await crud_recurring.list_templates(db, user.household_id, only_active=only_active)


@router.post(
    "",
    response_model=RecurringTemplateOut,
    status_code=status.HTTP_201_CREATED,
    summary="Aggiunge una spesa fissa al modello",
)
async def create_template(
    payload: RecurringTemplateCreate, db: DbSession, user: CurrentUser
) -> RecurringExpenseTemplate:
    await validate_member_id(db, user.household_id, payload.paid_by_id)
    tpl = await crud_recurring.create_template(db, user.household_id, payload)
    await db.commit()
    return tpl


async def _get_owned(db: DbSession, household_id: int, template_id: int):
    tpl = await crud_recurring.get_template(db, household_id, template_id)
    if tpl is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Spesa fissa non trovata"
        )
    return tpl


@router.patch(
    "/{template_id}", response_model=RecurringTemplateOut, summary="Modifica una spesa fissa"
)
async def update_template(
    payload: RecurringTemplateUpdate,
    db: DbSession,
    user: CurrentUser,
    template_id: Annotated[int, Path(ge=1)],
) -> RecurringExpenseTemplate:
    tpl = await _get_owned(db, user.household_id, template_id)
    await validate_member_id(db, user.household_id, payload.paid_by_id)
    updated = await crud_recurring.update_template(db, tpl, payload)
    await db.commit()
    return updated


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Elimina una spesa fissa dal modello",
)
async def delete_template(
    db: DbSession, user: CurrentUser, template_id: Annotated[int, Path(ge=1)]
) -> Response:
    tpl = await _get_owned(db, user.household_id, template_id)
    await crud_recurring.delete_template(db, tpl)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
