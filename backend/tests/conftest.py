import asyncio
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def users(client):
    created = []

    def create():
        login = f"test_{uuid.uuid4().hex[:12]}"
        response = client.post("/auth/register", json={"login": login, "password": "Integration123!"})
        assert response.status_code == 201, response.text
        payload = response.json()
        created.append(payload["user"]["id"])
        return {"login": login, "id": payload["user"]["id"], "token": payload["token"]}

    yield create
    asyncio.run(cleanup(created))


async def cleanup(user_ids):
    if not user_ids:
        return
    cleanup_engine = create_async_engine(settings.database_url, poolclass=NullPool)
    try:
        async with cleanup_engine.begin() as connection:
            workspace_ids = (
                await connection.execute(
                    text("select id from workspaces where owner_id = any(:ids)"),
                    {"ids": user_ids},
                )
            ).scalars().all()
            if workspace_ids:
                await connection.execute(
                    text("delete from activity_logs where workspace_id = any(:ids)"),
                    {"ids": workspace_ids},
                )
                await connection.execute(
                    text(
                        "delete from document_versions "
                        "where document_id in (select id from documents where workspace_id = any(:ids))"
                    ),
                    {"ids": workspace_ids},
                )
                await connection.execute(
                    text("delete from documents where workspace_id = any(:ids)"),
                    {"ids": workspace_ids},
                )
                await connection.execute(
                    text(
                        "delete from tasks "
                        "where board_id in (select id from boards where workspace_id = any(:ids))"
                    ),
                    {"ids": workspace_ids},
                )
                await connection.execute(
                    text("delete from boards where workspace_id = any(:ids)"),
                    {"ids": workspace_ids},
                )
                await connection.execute(
                    text("delete from workspace_members where workspace_id = any(:ids)"),
                    {"ids": workspace_ids},
                )
                await connection.execute(
                    text("delete from workspaces where id = any(:ids)"),
                    {"ids": workspace_ids},
                )
            await connection.execute(
                text("delete from workspace_members where user_id = any(:ids)"),
                {"ids": user_ids},
            )
            await connection.execute(text("delete from sessions where user_id = any(:ids)"), {"ids": user_ids})
            await connection.execute(text("delete from users where id = any(:ids)"), {"ids": user_ids})
    finally:
        await cleanup_engine.dispose()
