"""Settings read from environment variables. Nothing secret is stored in the repository."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    # In Cloud Run this is filled from the Secret Manager secret `model-api-key`.
    # Unset means AI features are disabled; the hello world routes do not need it.
    model_api_key: str | None
    greeting: str


def get_settings() -> Settings:
    return Settings(
        model_api_key=os.environ.get("MODEL_API_KEY") or None,
        greeting=os.environ.get("GREETING", "Hello from the Beatrix AI service"),
    )
