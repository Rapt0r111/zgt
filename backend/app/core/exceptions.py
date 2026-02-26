from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(404)
    async def not_found_handler(request: Request, _: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={
                "detail": "Resource not found",
                "path": request.url.path,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [
            {
                "loc": [str(item) for item in error.get("loc", [])],
                "msg": error.get("msg", "Invalid value"),
                "type": error.get("type", "validation_error"),
            }
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Validation error",
                "errors": errors,
                "path": request.url.path,
            },
        )
