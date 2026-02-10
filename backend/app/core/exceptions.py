from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

class NotFoundException(HTTPException):
    def __init__(self, detail: str = "Объект не найден"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class BadRequestException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

class SecureHTTPException(HTTPException):
    """Custom exception that logs details but returns generic message to user"""
    
    def __init__(
        self,
        status_code: int,
        user_message: str,
        internal_details: str = None
    ):
        super().__init__(status_code=status_code, detail=user_message)
        if internal_details:
            # Log for admins, don't send to client
            logger.error(f"[{status_code}] {user_message}: {internal_details}")