from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    common_incomes,
    expenses,
    members,
    periods,
    personal,
    recurring,
    summary,
    trash,
    trends,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(members.router)
# Prima dei periodi: "/periods/trends" e' una rotta fissa e verrebbe altrimenti
# catturata da "/periods/{period_id}".
api_router.include_router(trends.router)
api_router.include_router(periods.router)
api_router.include_router(expenses.router)
api_router.include_router(common_incomes.router)
api_router.include_router(summary.router)
api_router.include_router(recurring.router)
api_router.include_router(personal.router)
api_router.include_router(trash.router)
