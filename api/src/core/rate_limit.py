"""Rate limiting setup using slowapi + in-memory login brute-force protection."""
import logging
import time
from collections import defaultdict
from dataclasses import dataclass
from threading import Lock

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
#  slowapi generic limiter
# ---------------------------------------------------------------------------


def _key_func(request: Request) -> str:
    return get_remote_address(request)


def create_limiter() -> Limiter:
    return Limiter(
        key_func=_key_func,
        default_limits=[settings.RATE_LIMIT_DEFAULT],
        storage_uri=settings.REDIS_URL if settings.REDIS_URL else "memory://",
        enabled=settings.RATE_LIMIT_ENABLED,
    )


limiter = create_limiter()


async def rate_limit_exceeded_handler(request: Request, exc) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Trop de requetes, veuillez reessayer plus tard"},
    )


# ---------------------------------------------------------------------------
#  Login brute-force rate limiter (IP + email tracking)
# ---------------------------------------------------------------------------


@dataclass
class _AttemptRecord:
    count: int = 0
    first_attempt: float = 0.0
    locked_until: float = 0.0


class LoginRateLimiter:
    """Track failed login attempts and enforce lockout.

    Strategy:
    - Track by email (5 failures / 15 min -> 15 min lockout)
    - Track by IP   (20 failures / 15 min -> 15 min lockout)
    - Successful login resets the email counter
    - Periodic cleanup of stale entries
    """

    MAX_ATTEMPTS_EMAIL = 5
    MAX_ATTEMPTS_IP = 20
    WINDOW_SECONDS = 900       # 15 min
    LOCKOUT_SECONDS = 900      # 15 min
    _CLEANUP_INTERVAL = 300    # 5 min

    def __init__(self) -> None:
        self._by_email: dict[str, _AttemptRecord] = defaultdict(_AttemptRecord)
        self._by_ip: dict[str, _AttemptRecord] = defaultdict(_AttemptRecord)
        self._lock = Lock()
        self._last_cleanup = time.monotonic()

    # ------------------------------------------------------------------
    def check(self, email: str, ip: str) -> tuple[bool, int]:
        """Return (allowed, retry_after_seconds)."""
        now = time.monotonic()
        self._maybe_cleanup(now)
        with self._lock:
            for rec in (self._by_email[email.lower()], self._by_ip[ip]):
                if rec.locked_until > now:
                    return False, int(rec.locked_until - now)
        return True, 0

    def record_failure(self, email: str, ip: str) -> None:
        now = time.monotonic()
        with self._lock:
            for key, store, threshold in [
                (email.lower(), self._by_email, self.MAX_ATTEMPTS_EMAIL),
                (ip, self._by_ip, self.MAX_ATTEMPTS_IP),
            ]:
                rec = store[key]
                if now - rec.first_attempt > self.WINDOW_SECONDS:
                    rec.count = 0
                    rec.first_attempt = now
                rec.count += 1
                if rec.count >= threshold:
                    rec.locked_until = now + self.LOCKOUT_SECONDS

    def record_success(self, email: str) -> None:
        with self._lock:
            self._by_email.pop(email.lower(), None)

    # ------------------------------------------------------------------
    def _maybe_cleanup(self, now: float) -> None:
        if now - self._last_cleanup < self._CLEANUP_INTERVAL:
            return
        with self._lock:
            self._last_cleanup = now
            cutoff = now - self.WINDOW_SECONDS - self.LOCKOUT_SECONDS
            for store in (self._by_email, self._by_ip):
                stale = [k for k, v in store.items() if v.first_attempt < cutoff and v.locked_until < now]
                for k in stale:
                    del store[k]


login_limiter = LoginRateLimiter()
