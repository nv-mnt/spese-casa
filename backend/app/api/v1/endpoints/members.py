"""Gestione dei due membri dell'household."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Path, status
from sqlalchemy.exc import IntegrityError
from typing import Annotated

from app.api.deps import CurrentUser, DbSession
from app.crud import member as crud_member
from app.models.member import Member
from app.schemas.member import MemberOut, MemberUpdate

router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=list[MemberOut], summary="Elenca i membri")
async def list_members(db: DbSession, user: CurrentUser) -> list[Member]:
    return await crud_member.list_members(db, user.household_id)


@router.patch("/{member_id}", response_model=MemberOut, summary="Aggiorna nome/colore di un membro")
async def update_member(
    db: DbSession,
    user: CurrentUser,
    payload: MemberUpdate,
    member_id: Annotated[int, Path(ge=1)],
) -> Member:
    member = await crud_member.get_member(db, user.household_id, member_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membro non trovato")
    try:
        updated = await crud_member.update_member(db, member, payload)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esiste gia' un membro con questo nome",
        ) from exc
    return updated
