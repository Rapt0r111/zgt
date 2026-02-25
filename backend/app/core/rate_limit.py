"""
In-memory rate limiter для защиты эндпоинта /auth/login.

Ограничения текущего подхода (задокументированы намеренно):
- Состояние не разделяется между несколькими воркерами Uvicorn.
  Для production с несколькими воркерами нужен Redis (например, slowapi + redis).
- При перезапуске процесса счётчики сбрасываются.

Для одного воркера (дев/staging) – полностью корректен.
"""

import threading
import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class _Record:
    attempts: int = 0
    blocked_until: Optional[float] = None
    last_attempt: float = field(default_factory=time.monotonic)


class RateLimiter:
    """
    Блокирует IP после N неудачных попыток на W секунд.
    Thread-safe: использует RLock.
    TTL-очистка устаревших записей происходит автоматически при каждом вызове.
    """

    def __init__(
        self,
        max_attempts: int = 5,
        window_seconds: float = 900.0,   # 15 минут
        cleanup_interval: float = 300.0, # очистка каждые 5 минут
    ) -> None:
        self._max_attempts = max_attempts
        self._window = window_seconds
        self._cleanup_interval = cleanup_interval
        self._records: dict[str, _Record] = {}
        self._lock = threading.RLock()
        self._last_cleanup = time.monotonic()

    # ── Public API ────────────────────────────────────────────────────────────

    def is_allowed(self, ip: str) -> bool:
        """Вернёт False если IP заблокирован."""
        with self._lock:
            self._maybe_cleanup()
            record = self._records.get(ip)
            if record is None:
                return True
            if record.blocked_until and time.monotonic() < record.blocked_until:
                return False
            return True

    def record_attempt(self, ip: str) -> None:
        """Фиксирует неудачную попытку. При превышении лимита блокирует IP."""
        with self._lock:
            now = time.monotonic()
            record = self._records.setdefault(ip, _Record())

            # Сбрасываем старый блок, если истёк
            if record.blocked_until and now >= record.blocked_until:
                record.attempts = 0
                record.blocked_until = None

            record.attempts += 1
            record.last_attempt = now

            if record.attempts >= self._max_attempts:
                record.blocked_until = now + self._window

    def reset(self, ip: str) -> None:
        """Сбрасывает счётчик для IP (вызывается при успешной аутентификации)."""
        with self._lock:
            self._records.pop(ip, None)

    def remaining_seconds(self, ip: str) -> float:
        """Возвращает секунды до снятия блока (0 если не заблокирован)."""
        with self._lock:
            record = self._records.get(ip)
            if record and record.blocked_until:
                remaining = record.blocked_until - time.monotonic()
                return max(0.0, remaining)
            return 0.0

    # ── Internal ──────────────────────────────────────────────────────────────

    def _maybe_cleanup(self) -> None:
        """Удаляет записи, которые давно не обновлялись (TTL = window * 2)."""
        now = time.monotonic()
        if now - self._last_cleanup < self._cleanup_interval:
            return

        ttl = self._window * 2
        stale_keys = [
            ip for ip, rec in self._records.items()
            if now - rec.last_attempt > ttl
        ]
        for ip in stale_keys:
            del self._records[ip]

        self._last_cleanup = now


# Синглтон для импорта в роутерах
rate_limiter = RateLimiter(max_attempts=5, window_seconds=900)