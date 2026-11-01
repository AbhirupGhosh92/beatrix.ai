"""Placeholder AI routes. They return fixed, deterministic results marked `stub: true` so the site's
UI and server seam can be built before any model exists. Replace the bodies, keep the shapes.
Request bodies are never stored or logged."""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()

# Generous caps keep a stub from being used to push large payloads around.
MAX_JOB_TEXT = 20_000


class JobText(BaseModel):
    job_description: str = Field(default="", max_length=MAX_JOB_TEXT, alias="jobDescription")

    model_config = {"populate_by_name": True}


class ResumeInput(BaseModel):
    data: dict[str, Any]


class ResumeWithJob(ResumeInput, JobText):
    pass


@router.post("/tailor")
def tailor(body: ResumeWithJob) -> dict[str, Any]:
    # Stub: hands the resume back unchanged.
    return {"stub": True, "data": body.data}


@router.post("/score")
def score(body: ResumeInput) -> dict[str, Any]:
    return {
        "stub": True,
        "score": 72,
        "suggestions": ["Placeholder suggestion: add measurable results to your experience bullets."],
    }


@router.post("/skill-match")
def skill_match(body: ResumeWithJob) -> dict[str, Any]:
    return {
        "stub": True,
        "matchPercent": 64,
        "matched": ["Placeholder skill A", "Placeholder skill B"],
        "missing": ["Placeholder skill C"],
    }
