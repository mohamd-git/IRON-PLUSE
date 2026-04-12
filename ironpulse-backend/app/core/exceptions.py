"""
Centralised exception classes & FastAPI exception handlers.
"""

import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("ironpulse.errors")


class IronPulseError(Exception):
    """Base exception for domain errors."""

    def __init__(self, detail: str = "An error occurred", status_code: int = 400):
        self.detail = detail
        self.status_code = status_code


class NotFoundError(IronPulseError):
    def __init__(self, resource: str = "Resource"):
        super().__init__(detail=f"{resource} not found", status_code=404)


class ForbiddenError(IronPulseError):
    def __init__(self, detail: str = "Forbidden"):
        super().__init__(detail=detail, status_code=403)


class ConflictError(IronPulseError):
    def __init__(self, detail: str = "Conflict"):
        super().__init__(detail=detail, status_code=409)


class PaymentError(IronPulseError):
    def __init__(self, detail: str = "Payment processing failed"):
        super().__init__(detail=detail, status_code=402)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(IronPulseError)
    async def ironpulse_error_handler(_request: Request, exc: IronPulseError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        tb = traceback.format_exc()
        logger.error("Unhandled error on %s %s:\n%s", request.method, request.url.path, tb)
        return JSONResponse(
            status_code=500,
            content={"detail": f"{type(exc).__name__}: {exc}"},
        )
