from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Military Asset Management System"
    PROJECT_NAME: str = "ZGT System"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    SECURE_COOKIES: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/zgt"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"
    COOKIE_DOMAIN: str = ""

    BCRYPT_ROUNDS: int = 12

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("SECRET_KEY must be set in environment")
        return value

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL must use async DSN with postgresql+asyncpg://")
        return value

    @property
    def CSRF_TOKEN_EXPIRE(self) -> int:
        return self.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
