import re
import html
from datetime import date, timedelta

def sanitize_html(value: str) -> str:
    if not value:
        return value
    value = re.sub(r'<[^>]+>', '', value)
    value = html.escape(value)
    return value[:200]

def validate_date_range(date_value, min_year: int = 1950, max_years_ahead: int = 10):
    if date_value is None:
        return None
    
    if isinstance(date_value, str):
        try:
            date_value = date.fromisoformat(date_value)
        except ValueError:
            raise ValueError('Invalid date format')
    
    min_date = date(min_year, 1, 1)
    max_date = date.today() + timedelta(days=365 * max_years_ahead)
    
    if date_value < min_date or date_value > max_date:
        raise ValueError(f'Date must be between {min_date} and {max_date}')
    
    return date_value