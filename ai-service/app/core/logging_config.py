import logging
import json
import time
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Dict

# Context variables for tracing request contexts
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")
correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="")
start_time_ctx: ContextVar[float] = ContextVar("start_time", default=0.0)


class StructuredJsonFormatter(logging.Formatter):
    """
    JSON log formatter mapping timestamps, logging levels, system identifiers,
    and trace correlation contexts.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "service_name": "ragcx-ai-service",
            "request_id": request_id_ctx.get(),
            "correlation_id": correlation_id_ctx.get(),
        }

        # Calculate duration if active
        start_time = start_time_ctx.get()
        if start_time > 0.0:
            log_payload["execution_time_ms"] = round((time.time() - start_time) * 1000, 2)

        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        # Merge extra context dict fields
        if hasattr(record, "extra") and isinstance(record.extra, dict): # type: ignore
            for key, val in record.extra.items(): # type: ignore
                if key not in log_payload:
                    log_payload[key] = val

        return json.dumps(log_payload)


def configure_logging() -> None:
    root_logger = logging.getLogger()
    
    # Avoid duplicate handlers
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    handler = logging.StreamHandler()
    handler.setFormatter(StructuredJsonFormatter())
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

    # Disable generic uvicorn logs from repeating output formatting
    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(logger_name).handlers.clear()
        logging.getLogger(logger_name).propagate = True


logger = logging.getLogger("app")
configure_logging()
