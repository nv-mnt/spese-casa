"""Entrypoint FastAPI."""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DESCRIPTION = """
API del **gestionale di spese condivise di casa**.

* Le spese si dividono sempre **50/50** fra i due membri dell'household.
* Ogni **periodo** (tipicamente un mese) ha il proprio registro spese,
  il proprio riepilogo e il proprio blocco *Rimborso e saldo*.
* Le categorie sono un enum fisso: `Casa, Affitto, Bollette, Spesa,
  Trasporti, Svago, Salute, Altro`.

Autenticazione: `POST /api/v1/auth/login` (oppure il pulsante **Authorize**,
che usa `POST /api/v1/auth/token`), poi header `Authorization: Bearer <token>`.
"""


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Avvio %s (env=%s)", settings.PROJECT_NAME, settings.ENVIRONMENT)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=DESCRIPTION,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_: Request, exc: IntegrityError) -> JSONResponse:
    """Trasforma i vincoli violati in 409 leggibili invece di un 500."""
    logger.warning("IntegrityError: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "Operazione in conflitto con un vincolo di integrita' dei dati"},
    )


@app.get("/health", tags=["meta"], summary="Healthcheck")
async def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.ENVIRONMENT}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
