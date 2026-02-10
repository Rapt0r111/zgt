from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import field_validator 

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # App
    PROJECT_NAME: str = "ZGT System"
    VERSION: str = "1.0.0"
    DEBUG: bool = False  # ← CHANGED: False by default
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] | str = []
    
    # Cookie Settings
    COOKIE_DOMAIN: Optional[str] = None
    SECURE_COOKIES: bool = True
    
    # Pagination
    MAX_PAGE_SIZE: int = 1000
    DEFAULT_PAGE_SIZE: int = 100
    
    @field_validator('BACKEND_CORS_ORIGINS', mode='before')
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()