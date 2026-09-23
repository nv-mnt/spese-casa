"""Import aggregato dei modelli: serve ad Alembic per l'autogenerate."""

from app.db.base_class import Base  # noqa: F401
from app.models.common_income import CommonIncome  # noqa: F401
from app.models.expense import Expense  # noqa: F401
from app.models.household import Household  # noqa: F401
from app.models.member import Member  # noqa: F401
from app.models.period import Period  # noqa: F401
from app.models.personal import (  # noqa: F401
    Income,
    PersonalExpense,
    PersonalPeriod,
)
from app.models.recurring import RecurringExpenseTemplate  # noqa: F401
from app.models.settlement import Settlement  # noqa: F401
from app.models.user import User  # noqa: F401

__all__ = [
    "Base",
    "CommonIncome",
    "Expense",
    "Household",
    "Income",
    "Member",
    "Period",
    "PersonalExpense",
    "PersonalPeriod",
    "RecurringExpenseTemplate",
    "Settlement",
    "User",
]
