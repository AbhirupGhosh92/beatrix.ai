# ai_backend/ — Beatrix AI service

Private FastAPI service on Cloud Run, the home for LangChain and other AI code (`app/`).
Hello world only for now: `GET /health`, `GET /hello`, and a `/ws` WebSocket that greets and echoes.

## Run locally

```bash
cd ai_backend
python3 -m venv .venv && . .venv/bin/activate
pip install -e .
uvicorn app.main:app --port 8080
```

Check it: `curl localhost:8080/health`, then connect to `ws://localhost:8080/ws` (for example
`npx wscat -c ws://localhost:8080/ws`).

## Stub AI routes

Placeholders for the site's resume workspace. Each answers with a fixed result and `"stub": true`, needs no model key, and never stores or logs request bodies. The site's Next.js server is the only caller.

```bash
curl -s localhost:8080/skill-match -H 'content-type: application/json' \
  -d '{"data": {}, "jobDescription": "Android engineer"}'
curl -s localhost:8080/tailor -H 'content-type: application/json' -d '{"data": {}, "jobDescription": ""}'
curl -s localhost:8080/score -H 'content-type: application/json' -d '{"data": {}}'
```

A body of the wrong shape gets `422`. When real models are added, replace the bodies in `app/stubs.py` and keep the response shapes (`stub` becomes `false` or absent).

## Configuration

Environment variables only (see `.env.example`): `MODEL_API_KEY` (optional) and `GREETING`.

## Model API key (Secret Manager)

Terraform creates the empty secret `model-api-key`; set its value yourself so it never reaches Terraform state:

```bash
printf '%s' "$KEY" | gcloud secrets versions add model-api-key --project <project-id> --data-file=-
```

The next deploy of this component mounts the latest version as `MODEL_API_KEY`.

## Deployment

Part of the `python` deploy component (`scripts/deploy/components.sh`): deployed to Cloud Run from this
folder only when it changes. The service is private; only the App Hosting service account may invoke it.
