"""Configurazione applicativa, caricata da variabili d'ambiente / file .env."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Applicazione ---
    PROJECT_NAME: str = "Spese Casa API"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: Literal["development", "test", "production"] = "development"

    # --- Database ---
    # Deve essere un DSN async (postgresql+asyncpg://...)
    DATABASE_URL: str = "postgresql+asyncpg://spese:spese@localhost:5432/spese_casa"
    SQL_ECHO: bool = False

    # --- Sicurezza / JWT ---
    SECRET_KEY: str = Field(
        default="cambiami-in-produzione-con-una-stringa-lunga-e-casuale",
        min_length=16,
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # --- CORS ---
    # Lista separata da virgole, es. "http://localhost:5173,http://localhost:3000"
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    # --- Default dominio ---
    DEFAULT_HOUSEHOLD_NAME: str = "Casa"
    DEFAULT_MEMBER_A: str = "Giuseppe"
    DEFAULT_MEMBER_B: str = "Angela"
    DEFAULT_CURRENCY: str = "EUR"

    @field_validator("DATABASE_URL")
    @classmethod
    def _require_async_driver(cls, v: str) -> str:
        if v.startswith("postgresql://"):
            # Correzione di cortesia: molti provider espongono il DSN sincrono.
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
