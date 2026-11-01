"""Hello world FastAPI service. LangChain and other AI code will live in this package."""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from .config import get_settings
from .stubs import router as stub_router

app = FastAPI(title="Beatrix AI service")
app.include_router(stub_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/hello")
def hello() -> dict[str, object]:
    settings = get_settings()
    return {"message": settings.greeting, "ai_enabled": settings.model_api_key is not None}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    await websocket.send_text(get_settings().greeting)
    try:
        while True:
            text = await websocket.receive_text()
            await websocket.send_text(f"echo: {text}")
    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close(code=1011)
