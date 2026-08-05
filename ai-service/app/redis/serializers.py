import json
from typing import Dict, Any
from pydantic import ValidationError

from app.schemas.events import BusEvent
from app.core.exceptions import MessageValidationError, InvalidEventError


class MessageSerializer:
    @staticmethod
    def deserialize(raw_message: str) -> BusEvent:
        """
        Parses a raw Redis message payload string into a validated BusEvent.
        """
        try:
            parsed = json.loads(raw_message)
            if not isinstance(parsed, dict):
                raise InvalidEventError("Redis message must be a serialized JSON object.")
            return BusEvent(**parsed)
        except json.JSONDecodeError as e:
            raise InvalidEventError(f"Malformed JSON message: {str(e)}")
        except ValidationError as e:
            raise MessageValidationError(f"Event envelope validation failed: {str(e)}")

    @staticmethod
    def serialize(event: BusEvent) -> str:
        """
        Serializes a BusEvent to a JSON string.
        """
        return event.model_dump_json()


class MessageValidator:
    @staticmethod
    def validate_envelope(event: BusEvent) -> None:
        """
        Applies strict validation checks on event version and headers.
        """
        if not event.eventId or not event.eventType:
            raise InvalidEventError("Event must contain a valid eventId and eventType.")
        if event.version != "1.0":
            raise InvalidEventError(f"Unsupported event version: {event.version}. Only '1.0' is supported.")
