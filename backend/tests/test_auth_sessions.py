import asyncio
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.models import Session, User
from conftest import auth_header, cleanup, credentials


async def session_tokens(user_id):
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    try:
        async with engine.connect() as connection:
            return list((await connection.execute(select(Session.token).where(Session.user_id == user_id))).scalars())
    finally:
        await engine.dispose()


async def change_session(user_id, operation):
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    try:
        async with engine.begin() as connection:
            await connection.execute(text(operation), {"id": user_id})
    finally:
        await engine.dispose()


@pytest.mark.parametrize("path", ["/auth/login", "/auth/register"])
@pytest.mark.parametrize("remember", [False, True])
def test_active_session_blocks_repeated_auth_without_creating_rows(client, users, path, remember):
    user, other = users(), users()
    login = other["login"] if path.endswith("login") else "blocked_" + uuid4().hex
    payload = {**credentials(client, login, "Integration123!"), "remember": remember}
    before = asyncio.run(session_tokens(user["id"]))
    for _ in range(3):
        result = client.post(path, json=payload, headers=auth_header(user))
        assert result.status_code == 409
        assert result.json()["code"] == "already_authenticated"
        assert "set-cookie" not in result.headers
    assert asyncio.run(session_tokens(user["id"])) == before
    assert asyncio.run(session_tokens(other["id"])) == [other["cookie"]]
    assert client.get("/auth/me", headers=auth_header(user)).json()["id"] == user["id"]

    async def registered():
        engine = create_async_engine(settings.database_url, poolclass=NullPool)
        try:
            async with engine.connect() as connection:
                return await connection.scalar(select(User.id).where(User.login == login))
        finally:
            await engine.dispose()

    if path.endswith("register"):
        assert asyncio.run(registered()) is None


@pytest.mark.parametrize("state", ["expired", "revoked", "unknown"])
def test_invalid_cookie_does_not_block_login(client, users, state):
    user = users()
    if state == "expired":
        asyncio.run(change_session(user["id"], "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=:id"))
    else:
        asyncio.run(change_session(user["id"], "DELETE FROM sessions WHERE user_id=:id"))
    token = "unknown-session" if state == "unknown" else user["cookie"]
    result = client.post("/auth/login", json=credentials(client, user["login"], "Integration123!"),
                         headers={"Cookie": "ethereal_session=" + token})
    assert result.status_code == 200
    assert asyncio.run(session_tokens(user["id"])) == [result.cookies.get("ethereal_session")]
    client.cookies.clear()


def test_login_after_logout_creates_one_session(client, users):
    user = users()
    assert client.post("/auth/logout", headers=auth_header(user)).status_code == 204
    result = client.post("/auth/login", json=credentials(client, user["login"], "Integration123!"))
    assert result.status_code == 200
    assert asyncio.run(session_tokens(user["id"])) == [result.cookies.get("ethereal_session")]
    client.cookies.clear()


def test_expired_cookie_does_not_block_registration(client, users):
    user = users()
    asyncio.run(change_session(user["id"], "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=:id"))
    result = client.post("/auth/register", json=credentials(client, "new_" + uuid4().hex, "Integration123!"),
                         headers=auth_header(user))
    assert result.status_code == 201
    assert asyncio.run(session_tokens(user["id"])) == []
    asyncio.run(cleanup([result.json()["user"]["id"]]))
    client.cookies.clear()
