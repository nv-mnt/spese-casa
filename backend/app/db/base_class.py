"""Classe base dichiarativa condivisa da tutti i modelli."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric
from sqlalchemy.orm import DeclarativeBase

# Tipo monetario unico per tutto il dominio: 2 decimali, mai float.
MONEY = Numeric(12, 2, asdecimal=True)


class Base(DeclarativeBase):
    type_annotation_map = {
        Decimal: MONEY,
        datetime: DateTime(timezone=True),
    }
