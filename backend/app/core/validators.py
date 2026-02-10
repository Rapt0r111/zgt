import re
import html
from typing import Any

SAFE_PATTERN = re.compile(r'^[a-zA-Z0-9а-яА-ЯёЁ\s\-_.]+$')

def sanitize_search_input(value: str) -> str:
    """Sanitize user search input to prevent SQLi in raw queries"""
    if not value:
        return value
    
    if not SAFE_PATTERN.match(value):
        raise ValueError("Invalid search pattern - only alphanumeric characters allowed")
    
    return value.strip()[:200]  # Limit length

def sanitize_html(value: str) -> str:
    """Remove HTML tags and escape special chars"""
    if not value:
        return value
    
    # Strip tags
    value = re.sub(r'<[^>]+>', '', value)
    # Escape HTML entities
    value = html.escape(value)
    # Limit length
    return value[:200]

def validate_date_range(date_value, min_year: int = 1950, max_years_ahead: int = 10):
    """Validate date is within reasonable range"""
    from datetime import date, timedelta
    
    if date_value is None:
        return None
    
    # Convert string to date if needed
    if isinstance(date_value, str):
        try:
            date_value = date.fromisoformat(date_value)
        except ValueError:
            raise ValueError('Invalid date format')
    
    min_date = date(min_year, 1, 1)
    max_date = date.today() + timedelta(days=365 * max_years_ahead)
    
    if date_value < min_date:
        raise ValueError(f'Date cannot be earlier than {min_date}')
    if date_value > max_date:
        raise ValueError(f'Date cannot be later than {max_date}')
    
    return date_value