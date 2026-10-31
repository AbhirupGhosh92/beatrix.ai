FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv

COPY pyproject.toml ./
RUN pip install --no-cache-dir "fastapi>=0.115,<1" "uvicorn[standard]>=0.30,<1"

COPY app ./app
RUN useradd --system --no-create-home app
USER app

# Cloud Run sets PORT.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
