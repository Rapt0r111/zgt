from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings
import secrets

ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        ph.verify(hashed_password, plain_password)
        return True
    except VerifyMismatchError:
        return False

def get_password_hash(password: str) -> str:
    return ph.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None

CSRF_SECRET = settings.SECRET_KEY + "_csrf"
CSRF_TOKEN_EXPIRE = 3600

def generate_csrf_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(seconds=CSRF_TOKEN_EXPIRE),
        "nonce": secrets.token_urlsafe(16)
    }
    return jwt.encode(payload, CSRF_SECRET, algorithm="HS256")

def verify_csrf_token(token: str, user_id: int) -> bool:
    try:
        payload = jwt.decode(token, CSRF_SECRET, algorithms=["HS256"])
        return payload.get("user_id") == user_id
    except JWTError:
        return False

def generate_secure_password(length: int = 16) -> str:
    import string
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))