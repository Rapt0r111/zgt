# backend/app/core/logging.py (СОЗДАТЬ)
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    logger = logging.getLogger("zgt_system")
    logger.setLevel(logging.INFO)
    
    handler = RotatingFileHandler(
        "logs/app.log",
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger

# В main.py
from app.core.logging import setup_logging
logger = setup_logging()

# Использование в сервисах
logger.info(f"User {current_user.id} created equipment {equipment.id}")