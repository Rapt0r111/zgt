import secrets

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Приложение ---
    APP_NAME: str = "Military Asset Management System"
    PROJECT_NAME: str = "ZGT System"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # --- Безопасность ---
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    SECURE_COOKIES: bool = False

    # --- База данных ---
    DATABASE_URL: str = "sqlite:///./dev.db"

    # --- JWT / сессия ---
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # --- CSRF ---
    # CSRF-токен живёт столько же, сколько сессия – чтобы мутирующие
    # запросы не падали с 403 раньше истечения сессии.
    @property
    def CSRF_TOKEN_EXPIRE(self) -> int:
        return self.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    # --- CORS ---
    # Объявляем как str, а не list[str]: pydantic-settings пытается парсить
    # list-поля как JSON, и падает на строках вида "http://a.com, http://b.com".
    # Разбиение по запятой делается в @property ниже.
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"
    COOKIE_DOMAIN: str = ""

    @property
    def cors_origins(self) -> list[str]:
        """Список разрешённых origins для CORS-middleware."""
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    # --- Хеширование паролей ---
    BCRYPT_ROUNDS: int = 12

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "allow"  # не падать при появлении новых переменных в .env


settings = Settings()