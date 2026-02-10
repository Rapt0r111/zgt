from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """Simple in-memory rate limiter for login attempts"""
    
    def __init__(self):
        # {ip_address: [(timestamp, attempt_count)]}
        self.attempts: Dict[str, List[Tuple[datetime, int]]] = defaultdict(list)
        self.lockout_duration = timedelta(minutes=15)
        self.max_attempts = 5
        self.window = timedelta(minutes=5)
    
    def is_allowed(self, ip: str) -> bool:
        """Check if IP is allowed to make request"""
        now = datetime.utcnow()
        
        # Clean old attempts outside window
        self.attempts[ip] = [
            (ts, count) for ts, count in self.attempts[ip]
            if now - ts < self.window
        ]
        
        # Check if locked out
        if self.attempts[ip]:
            total = sum(count for _, count in self.attempts[ip])
            if total >= self.max_attempts:
                oldest = min(ts for ts, _ in self.attempts[ip])
                if now - oldest < self.lockout_duration:
                    logger.warning(f"Rate limit exceeded for IP: {ip}")
                    return False
                else:
                    # Reset after lockout period
                    self.attempts[ip] = []
        
        return True
    
    def record_attempt(self, ip: str):
        """Record failed login attempt"""
        self.attempts[ip].append((datetime.utcnow(), 1))
    
    def reset(self, ip: str):
        """Reset counter on successful login"""
        if ip in self.attempts:
            del self.attempts[ip]

# Global instance
rate_limiter = RateLimiter()