from contextlib import asynccontextmanager
from pathlib import Path

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory

from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm.exc import StaleDataError
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.routers import auth, boards, documents, folders, search, tasks, users, workspaces, notifications, sync
from app.errors import MESSAGES


@asynccontextmanager
async def lifespan(app: FastAPI):
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
    expected = set(ScriptDirectory.from_config(config).get_heads())
    try:
        async with engine.connect() as conn:
            current = await conn.run_sync(lambda sync: set(MigrationContext.configure(sync).get_current_heads()))
        if current != expected:
            raise RuntimeError("Database migrations are missing or outdated. Run: alembic upgrade head")
        yield
    finally:
        await engine.dispose()


app = FastAPI(title="Ethereal API", lifespan=lifespan, root_path=settings.api_root_path)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(workspaces.router)
app.include_router(boards.router)
app.include_router(tasks.router)
app.include_router(documents.router)
app.include_router(folders.router)
app.include_router(search.router)
app.include_router(notifications.router)
app.include_router(sync.router)


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        payload = detail
    else:
        code = {401: "unauthorized", 403: "forbidden", 404: "not_found", 409: "revision_conflict"}.get(exc.status_code, "request_failed")
        payload = {"detail": detail, "code": code}
    return JSONResponse(payload, status_code=exc.status_code, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    consent = any("consent" in error["loc"] for error in exc.errors())
    code = "consent_required" if consent else "validation_error"
    return JSONResponse({"detail": MESSAGES[code], "code": code}, status_code=422)


@app.exception_handler(StaleDataError)
async def stale_error(request: Request, exc: StaleDataError):
    return JSONResponse({"detail": MESSAGES["revision_conflict"], "code": "revision_conflict"}, status_code=409)


@app.get("/")
async def root():
    return {"status": "ok"}
