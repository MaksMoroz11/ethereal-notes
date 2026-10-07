import asyncio
import uuid
import base64
import os

if not os.environ.get("TEST_DATABASE_URL"):
    raise RuntimeError("Use an isolated test database: python tests/run_isolated.py (or set TEST_DATABASE_URL)")
os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.main import app


def credentials(client, login, password):
    info = client.get("/auth/public-key").json()
    public_key = serialization.load_der_public_key(base64.b64decode(info["public_key"]))
    aes_key = os.urandom(32)
    nonce = os.urandom(12)
    encrypted_key = public_key.encrypt(
        aes_key, padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),
                              algorithm=hashes.SHA256(), label=None),
    )
    return {
        "consent": True,
        "consent_version": settings.consent_version,
        "login": login,
        "key_id": info["key_id"],
        "encrypted_key": base64.b64encode(encrypted_key).decode(),
        "nonce": base64.b64encode(nonce).decode(),
        "encrypted_password": base64.b64encode(AESGCM(aes_key).encrypt(nonce, password.encode(), None)).decode(),
    }


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def users(client):
    created = []
    client.cookies.clear()

    def create():
        login = f"test_{uuid.uuid4().hex[:12]}"
        client.cookies.clear()
        response = client.post("/auth/register", json=credentials(client, login, "Integration123!"))
        assert response.status_code == 201, response.text
        payload = response.json()
        created.append(payload["user"]["id"])
        cookie = response.cookies.get("ethereal_session")
        client.cookies.clear()
        return {"login": login, "id": payload["user"]["id"], "cookie": cookie, "csrf": payload["csrf_token"]}

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
                    text("delete from board_columns where board_id in (select id from boards where workspace_id = any(:ids))"),
                    {"ids": workspace_ids},
                )
                await connection.execute(
                    text("delete from boards where workspace_id = any(:ids)"),
                    {"ids": workspace_ids},
                )
                await connection.execute(
                    text("delete from folders where workspace_id = any(:ids)"),
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


def auth_header(user):
    return {"Cookie": f"ethereal_session={user['cookie']}", "X-CSRF-Token": user["csrf"]}


def versioned_patch(client, url, **kwargs):
    if url.startswith(("/tasks/", "/documents/")) and "json" in kwargs:
        current = client.get(url, headers=kwargs.get("headers", {}))
        kwargs["json"] = {"expected_revision": current.json().get("revision", 1), **kwargs["json"]}
    return client.patch(url, **kwargs)


def versioned_post(client, url, **kwargs):
    if url.startswith("/documents/") and (url.endswith("/versions") or "/restore/" in url):
        current = client.get("/".join(url.split("/")[:3]), headers=kwargs.get("headers", {}))
        kwargs["json"] = {"expected_revision": current.json().get("revision", 1), **kwargs.get("json", {})}
    return client.post(url, **kwargs)
