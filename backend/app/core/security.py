from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings

# Argon2id - современный стандарт
ph = PasswordHasher(
    time_cost=3,        # Итерации
    memory_cost=65536,  # 64 МБ памяти
    parallelism=4,      # Потоки
    hash_len=32,        # Длина хеша
    salt_len=16         # Длина соли
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля с Argon2"""
    try:
        ph.verify(hashed_password, plain_password)
        
        # Автоматический rehash если параметры устарели
        if ph.check_needs_rehash(hashed_password):
            return True  # Сигнал для обновления хеша
        return True
    except VerifyMismatchError:
        return False

def get_password_hash(password: str) -> str:
    """Хеширование пароля с Argon2"""
    return ph.hash(password)

# JWT функции остаются без изменений
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None