from conftest import versioned_patch, versioned_post
import asyncio
import os
import subprocess
import sys
from uuid import uuid4

import asyncpg
import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from conftest import credentials
from test_api import auth_header, add_column


@pytest.fixture
def resources(client, users):
    owner = users()
    headers = auth_header(owner)
    workspace = client.get("/workspaces", headers=headers).json()[0]["id"]
    board = versioned_post(client, "/boards", headers=headers, json={"workspace_id": workspace, "title": "Board"}).json()
    column = add_column(client, board, headers)
    task = versioned_post(client, "/tasks", headers=headers, json={"board_id": board["id"], "column_id": column["id"], "title": "Task"}).json()
    document = versioned_post(client, "/documents", headers=headers, json={"workspace_id": workspace, "title": "Document"}).json()
    return owner, headers, workspace, board, column, task, document


def test_activity_has_author_title_and_timestamp(client, resources):
    owner, headers, workspace, _, _, task, _ = resources
    activity = client.get(f"/workspaces/{workspace}/activity", headers=headers).json()
    event = next(item for item in activity if item["entity_id"] == task["id"])
    assert event["user_login"] == owner["login"]
    assert event["title"] == "Task"
    assert event["created_at"]


@pytest.mark.parametrize("entity,fields", [
    ("boards", ["title"]),
    ("tasks", ["title", "description", "tags", "column_id"]),
    ("documents", ["title", "content"]),
])
def test_invalid_patch_does_not_change_entity(client, resources, entity, fields):
    _, headers, _, board, _, task, document = resources
    value = {"boards": board, "tasks": task, "documents": document}[entity]
    path = f"/{entity}/{value['id']}"
    for field in fields:
        assert versioned_patch(client, path, headers=headers, json={field: None}).status_code == 422
    assert versioned_patch(client, path, headers=headers, json={"title": "   "}).status_code == 422
    assert client.get(path, headers=headers).json()["title"] == value["title"]


def test_nullable_references_and_empty_content_still_work(client, resources):
    _, headers, _, board, _, task, document = resources
    assert versioned_patch(client, f"/boards/{board['id']}", headers=headers, json={"folder_id": None}).status_code == 200
    assert versioned_patch(client, f"/tasks/{task['id']}", headers=headers, json={"assignee_id": None, "description": "", "tags": []}).status_code == 200
    assert versioned_patch(client, f"/documents/{document['id']}", headers=headers, json={"folder_id": None, "content": ""}).status_code == 200


def test_column_patch_rejects_null_mandatory_fields(client, resources):
    _, headers, _, board, column, _, _ = resources
    path = f"/boards/{board['id']}/columns/{column['id']}"
    for body in ({"title": None}, {"title": "  "}, {"position": None}):
        assert versioned_patch(client, path, headers=headers, json=body).status_code == 422


def test_saving_latest_version_restores_current_content_without_duplicate(client, resources):
    _, headers, _, _, _, _, document = resources
    path = f"/documents/{document['id']}"
    snapshot = {"title": "Snapshot", "content": "Saved text"}
    first = versioned_post(client, path + "/versions", headers=headers, json=snapshot).json()
    assert versioned_patch(client, path, headers=headers, json={"title": "Different", "content": "Different text"}).status_code == 200
    saved = versioned_post(client, path + "/versions", headers=headers, json=snapshot).json()
    assert saved["title"] == snapshot["title"] and saved["content"] == snapshot["content"]
    assert [version["id"] for version in saved["versions"]] == [version["id"] for version in first["versions"]]


def test_explicit_snapshot_records_current_content_changed_by_patch(client, resources):
    _, headers, _, _, _, _, document = resources
    path = f"/documents/{document['id']}"
    assert versioned_post(client, path + "/versions", headers=headers, json={"title": "Document", "content": "First"}).status_code == 200
    snapshot = {"title": "Document", "content": "Second"}
    assert versioned_patch(client, path, headers=headers, json=snapshot).status_code == 200
    saved = versioned_post(client, path + "/versions", headers=headers, json=snapshot).json()
    assert len(saved["versions"]) == 2
    assert saved["versions"][0]["content"] == "Second"


def test_registration_requires_four_characters(client):
    response = versioned_post(client, "/auth/register", json=credentials(client, "short_" + uuid4().hex, "abc"))
    assert response.status_code == 422


@pytest.mark.parametrize("kind", ["board", "document"])
def test_recursive_folder_deletion_is_confirmed_scoped_and_removes_dependents(client, users, kind):
    owner, member, outsider = users(), users(), users()
    headers = auth_header(owner)
    workspace = client.get("/workspaces", headers=headers).json()[0]["id"]
    versioned_post(client, f"/workspaces/{workspace}/members", headers=headers, json={"login": member["login"]})

    def folder(title, parent=None, folder_kind=kind):
        result = versioned_post(client, "/folders", headers=headers, json={"workspace_id": workspace, "kind": folder_kind, "title": title, "parent_id": parent})
        assert result.status_code == 201
        return result.json()

    root = folder("Legacy")
    child = folder("Nested", root["id"])
    leaf = folder("Leaf", child["id"])
    sibling = folder("Keep")
    other_kind = folder("Other kind", folder_kind="document" if kind == "board" else "board")
    path = f"/folders/{root['id']}"
    entity_path = "/boards" if kind == "board" else "/documents"

    def entity(folder_id):
        result = versioned_post(client, entity_path, headers=headers, json={"workspace_id": workspace, "title": "Content", "folder_id": folder_id})
        assert result.status_code == 201
        return result.json()

    contents = [entity(root["id"]), entity(child["id"]), entity(leaf["id"])]
    keep = entity(sibling["id"])
    if kind == "board":
        column = add_column(client, contents[0], headers)
        task = versioned_post(client, "/tasks", headers=headers, json={"board_id": contents[0]["id"], "column_id": column["id"], "title": "Hidden task", "assignee_id": member["id"]}).json()
        assert client.get(f"/boards/{contents[0]['id']}", headers=headers).json()["tasks"] == []
    else:
        assert versioned_post(client, f"/documents/{contents[0]['id']}/versions", headers=headers, json={"title": "Snapshot", "content": "Old documentation"}).status_code == 200

    assert client.delete(path + "?recursive=true", headers=auth_header(outsider)).status_code == 404
    assert client.delete(path + "?recursive=true", headers=auth_header(member)).status_code == 403
    assert client.delete(path, headers=headers).status_code == 400
    assert client.get(entity_path + f"/{contents[0]['id']}", headers=headers).status_code == 200
    assert client.delete(path + "?recursive=true", headers=headers).status_code == 204
    remaining = client.get(f"/folders?workspace_id={workspace}&kind={kind}", headers=headers).json()
    assert [item["id"] for item in remaining] == [sibling["id"]]
    assert other_kind["id"] in [item["id"] for item in client.get(f"/folders?workspace_id={workspace}&kind={other_kind['kind']}", headers=headers).json()]
    for content in contents:
        assert client.get(entity_path + f"/{content['id']}", headers=headers).status_code == 404
    assert client.get(entity_path + f"/{keep['id']}", headers=headers).status_code == 200
    if kind == "board":
        assert client.get(f"/tasks/{task['id']}", headers=headers).status_code == 404
    events = client.get(f"/workspaces/{workspace}/activity", headers=headers).json()
    assert any(event["action"] == "folder.delete" and event["entity_id"] == root["id"] for event in events)


def test_login_upgrades_legacy_hash_without_breaking_session(client, users):
    user = users()
    legacy = CryptContext(schemes=["bcrypt"]).hash("old")

    async def password_hash(replacement=None):
        engine = create_async_engine(settings.database_url, poolclass=NullPool)
        try:
            async with engine.begin() as connection:
                if replacement:
                    await connection.execute(text("update users set password=:value where id=:id"), {"value": replacement, "id": user["id"]})
                return await connection.scalar(text("select password from users where id=:id"), {"id": user["id"]})
        finally:
            await engine.dispose()

    asyncio.run(password_hash(legacy))
    response = versioned_post(client, "/auth/login", json=credentials(client, user["login"], "old"))
    assert response.status_code == 200
    assert asyncio.run(password_hash()).startswith("$bcrypt-sha256$")
    assert client.get("/auth/me", headers=auth_header(user)).status_code == 200
    assert client.get("/auth/me", headers={"Cookie": "ethereal_session=" + response.cookies.get("ethereal_session")}).status_code == 200


def test_docs_and_openapi_honor_api_prefix(client):
    from app.main import app
    prefixed = TestClient(app, root_path="/api")
    assert '/api/openapi.json' in prefixed.get("/docs").text
    assert {"url": "/api"} in prefixed.get("/openapi.json").json()["servers"]


@pytest.mark.parametrize("revision", [None, "a785020bb2ab"])
def test_startup_refuses_missing_or_outdated_migrations(monkeypatch, revision):
    import app.main as main
    name = "ethereal_startup_" + uuid4().hex
    admin = make_url(settings.database_url).set(drivername="postgresql")
    database = make_url(settings.database_url).set(database=name)

    async def create_database():
        connection = await asyncpg.connect(admin.render_as_string(hide_password=False))
        try:
            await connection.execute(f'CREATE DATABASE "{name}"')
        finally:
            await connection.close()

    async def remove_database():
        connection = await asyncpg.connect(admin.render_as_string(hide_password=False))
        try:
            await connection.execute(f'DROP DATABASE "{name}"')
        finally:
            await connection.close()

    asyncio.run(create_database())
    try:
        if revision:
            env = dict(os.environ, DATABASE_URL=database.render_as_string(hide_password=False))
            subprocess.run([sys.executable, "-m", "alembic", "upgrade", revision], env=env, check=True)
        engine = create_async_engine(database.render_as_string(hide_password=False), poolclass=NullPool)
        monkeypatch.setattr(main, "engine", engine)
        with pytest.raises(RuntimeError, match="alembic upgrade head"):
            with TestClient(main.app):
                pass
    finally:
        asyncio.run(remove_database())
