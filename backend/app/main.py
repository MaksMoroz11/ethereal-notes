from contextlib import asynccontextmanager
from pathlib import Path

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.routers import auth, boards, documents, folders, search, tasks, users, workspaces


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


@app.get("/")
async def root():
    return {"status": "ok"}
