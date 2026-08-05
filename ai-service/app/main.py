import time
import uuid
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.container import Container
from app.core.logging_config import (
    request_id_ctx,
    correlation_id_ctx,
    start_time_ctx,
    logger,
)
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Lifespan Manager handling application startup and shutdown events.
    """
    logger.info("Initializing application container and connection pools...")
    
    # Instantiate DI Container
    container = Container()
    app.state.container = container

    # Initialize singletons to establish pools/connections
    redis_client = container.redis_client()
    http_client = container.http_client()

    # Resolve and start Redis worker
    worker = container.redis_worker()
    await worker.start()

    logger.info("Application container loaded successfully. Services online.")
    
    yield

    # Shutdown / cleanup connection pools gracefully
    logger.info("Application shutting down. Cleaning up resource connections...")
    await worker.stop()
    await redis_client.close()
    await http_client.aclose()
    logger.info("Shutdown sequence complete. Resource connections closed.")


def create_app() -> FastAPI:
    """
    FastAPI Application Factory.
    """
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ─── Middleware ─────────────────────────────────────────────────────────

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Tracing & Log Injector Middleware
    @app.middleware("http")
    async def tracing_middleware(request: Request, call_next):
        # 1. Resolve trace headers
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        corr_id = request.headers.get("X-Correlation-ID") or req_id

        # 2. Bind tracing context variables
        token_req = request_id_ctx.set(req_id)
        token_corr = correlation_id_ctx.set(corr_id)
        token_time = start_time_ctx.set(time.time())

        logger.info(
            f"Incoming Request: {request.method} {request.url.path}",
            extra={
                "method": request.method,
                "path": request.url.path,
                "query_params": str(request.query_params),
            },
        )

        try:
            response = await call_next(request)
            
            # Inject tracing headers to client response
            response.headers["X-Request-ID"] = req_id
            response.headers["X-Correlation-ID"] = corr_id
            
            logger.info(
                f"Request Completed: {request.method} {request.url.path} - {response.status_code}",
                extra={
                    "status_code": response.status_code,
                },
            )
            return response

        except Exception as exc:
            logger.error(
                f"Request Failed: {request.method} {request.url.path} - Error: {str(exc)}",
                exc_info=True,
            )
            raise exc

        finally:
            # Clean context variables
            request_id_ctx.reset(token_req)
            correlation_id_ctx.reset(token_corr)
            start_time_ctx.reset(token_time)

    # ─── Exception Handlers ──────────────────────────────────────────────────

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        details = []
        for error in exc.errors():
            details.append({
                "field": " -> ".join(map(str, error["loc"][1:])),
                "message": error["msg"],
                "rule": error["type"],
            })

        logger.warning(
            "Validation Error: request payload validation failed",
            extra={"validation_errors": details},
        )

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": details,
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(
            f"Unhandled Exception caught: {str(exc)}",
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
            },
        )

    # ─── Routing ─────────────────────────────────────────────────────────────

    app.include_router(api_router, prefix=settings.API_V1_STR)

    return app


app = create_app()
