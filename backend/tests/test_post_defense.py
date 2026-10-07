import asyncio
import sys
from io import BytesIO
from zipfile import ZipFile

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.exporting import html_of, parse_content, generate_docx
from app.models import Consent
from conftest import auth_header, credentials


def setup_team(client, users):
    owner, member, outsider = users(), users(), users()
    headers = auth_header(owner)
    workspace = client.get("/workspaces", headers=headers).json()[0]
    space_id = workspace["id"]
    client.post(f"/workspaces/{space_id}/members", json={"login": member["login"]}, headers=headers)
    board = client.post("/boards", json={"title": "Команда", "workspace_id": space_id}, headers=headers).json()
    columns = [client.post(f"/boards/{board['id']}/columns", json={"title": title}, headers=headers).json() for title in ("План", "Готово")]
    task = client.post("/tasks", json={"board_id": board["id"], "column_id": columns[0]["id"], "title": "Проверка", "assignee_id": member["id"]}, headers=headers).json()
    return owner, member, outsider, space_id, board, columns, task


def test_register_requires_separate_current_consent(client):
    data = credentials(client, "no_consent", "Password123!")
    for consent in (None, False):
        payload = dict(data)
        if consent is None:
            del payload["consent"]
        else:
            payload["consent"] = consent
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 422
        assert response.json()["code"] == "consent_required"
    response = client.post("/auth/register", json={**data, "consent_version": "old"})
    assert response.status_code == 422
    assert response.json()["code"] == "consent_outdated"


def test_consent_is_recorded_and_session_is_http_only(client, users):
    user = users()

    async def read():
        engine = create_async_engine(settings.database_url, poolclass=NullPool)
        try:
            async with engine.connect() as connection:
                return (await connection.execute(select(Consent.version, Consent.accepted_at).where(Consent.user_id == user["id"]))).one()
        finally:
            await engine.dispose()

    version, accepted_at = asyncio.run(read())
    assert version == settings.consent_version and accepted_at
    response = client.post("/auth/login", json={**credentials(client, user["login"], "Integration123!"), "remember": True})
    assert response.status_code == 200
    assert "token" not in response.json()
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie and "max-age=2592000" in cookie
    client.cookies.clear()


def test_csrf_origin_and_bearer_cannot_bypass_cookies(client, users):
    user = users()
    headers = auth_header(user)
    url = "/workspaces"
    assert client.post(url, json={"name": "Denied"}, headers={"Cookie": headers["Cookie"]}).status_code == 403
    assert client.post(url, json={"name": "Denied"}, headers={**headers, "Origin": "https://evil.example"}).status_code == 403
    assert client.post(url, json={"name": "Allowed"}, headers={**headers, "Origin": "http://localhost"}).status_code == 201
    assert client.get("/auth/me", headers={"Authorization": "Bearer " + user["cookie"]}).status_code == 401
    assert client.post("/auth/login", json=credentials(client, user["login"], "Integration123!"), headers={"Origin": "https://evil.example"}).status_code == 403


def test_member_move_conflict_noop_and_notifications(client, users):
    owner, member, outsider, space, board, columns, task = setup_team(client, users)
    headers = auth_header(member)
    path = f"/tasks/{task['id']}/move"
    move = {"column_id": columns[1]["id"], "expected_revision": task["revision"]}
    assert client.post(path, json=move, headers=auth_header(outsider)).status_code == 404
    result = client.post(path, json=move, headers=headers)
    assert result.status_code == 200
    saved = result.json()
    assert saved["revision"] > task["revision"] and saved["column_id"] == columns[1]["id"]
    assert client.post(path, json=move, headers=headers).status_code == 409
    noop = client.post(path, json={**move, "expected_revision": saved["revision"]}, headers=headers)
    assert noop.json()["revision"] == saved["revision"]
    assert client.patch(f"/tasks/{task['id']}", json={"title": "Denied", "expected_revision": saved["revision"]}, headers=headers).status_code == 403
    own_feed = client.get("/notifications", headers=headers).json()
    assert [item["kind"] for item in own_feed["items"]].count("task.assign") == 1
    assert not any(item["kind"] == "task.move" for item in own_feed["items"])
    feed = client.get("/notifications", headers=auth_header(owner)).json()
    assert [item["kind"] for item in feed["items"]].count("task.move") == 1
    sync = client.get(f"/workspaces/{space}/sync", headers=headers).json()
    assert sync["boards"][0]["revision"] > board["revision"]
    assert "tasks" not in sync["boards"][0]


def test_foreign_column_and_unassigned_tasks_cannot_be_moved(client, users):
    owner, member, outsider, space, board, columns, task = setup_team(client, users)
    headers = auth_header(owner)
    other_board = client.post("/boards", json={"title": "Other", "workspace_id": space}, headers=headers).json()
    foreign = client.post(f"/boards/{other_board['id']}/columns", json={"title": "Other"}, headers=headers).json()
    assert client.post(f"/tasks/{task['id']}/move", json={"column_id": foreign["id"], "expected_revision": task["revision"]}, headers=auth_header(member)).status_code == 400
    unassigned = client.post("/tasks", json={"board_id": board["id"], "column_id": columns[0]["id"], "title": "Unassigned"}, headers=headers).json()
    assert client.post(f"/tasks/{unassigned['id']}/move", json={"column_id": columns[1]["id"], "expected_revision": 1}, headers=auth_header(member)).status_code == 404


def test_notifications_read_ownership_and_revoked_access(client, users):
    owner, member, outsider, space, board, columns, task = setup_team(client, users)
    headers = auth_header(member)
    feed = client.get("/notifications", headers=headers).json()
    item = next(item for item in feed["items"] if item["kind"] == "task.assign")
    client.post(f"/notifications/{item['id']}/read", headers=auth_header(outsider))
    assert client.get("/notifications", headers=headers).json()["unread_count"] == feed["unread_count"]
    client.post(f"/notifications/{item['id']}/read", headers=headers)
    assert client.get("/notifications", headers=headers).json()["unread_count"] == feed["unread_count"] - 1
    client.delete(f"/workspaces/{space}/members/{member['id']}", headers=auth_header(owner))
    hidden = client.get("/notifications", headers=headers).json()["items"]
    assert all(not item["accessible"] and item["entity_id"] is None for item in hidden)
    assert all("Проверка" not in item["title"] for item in hidden)


def test_document_conflict_does_not_replace_saved_content(client, users):
    owner = users()
    headers = auth_header(owner)
    space = client.get("/workspaces", headers=headers).json()[0]["id"]
    doc = client.post("/documents", json={"title": "Document", "workspace_id": space}, headers=headers).json()
    url = f"/documents/{doc['id']}/versions"
    first = client.post(url, json={"title": "Document", "content": "First", "expected_revision": doc["revision"]}, headers=headers)
    assert first.status_code == 200
    stale = client.post(url, json={"title": "Document", "content": "Stale", "expected_revision": doc["revision"]}, headers=headers)
    assert stale.status_code == 409 and stale.json()["code"] == "revision_conflict"
    latest = client.get(f"/documents/{doc['id']}", headers=headers).json()
    assert latest["content"] == "First" and len(latest["versions"]) == 1


def test_notification_failure_rolls_back_move(client, users, monkeypatch):
    owner, member, outsider, space, board, columns, task = setup_team(client, users)
    async def broken(*args, **kwargs):
        raise RuntimeError("notification failure")
    monkeypatch.setattr("app.routers.tasks.notify", broken)
    with pytest.raises(RuntimeError, match="notification failure"):
        client.post(f"/tasks/{task['id']}/move", json={"column_id": columns[1]["id"], "expected_revision": task["revision"]}, headers=auth_header(member))
    saved = client.get(f"/tasks/{task['id']}", headers=auth_header(member)).json()
    assert saved["column_id"] == columns[0]["id"] and saved["revision"] == task["revision"]


def test_export_tree_removes_active_content_and_keeps_formatting():
    root = parse_content('<h2>Кириллица</h2><p><strong>Важно</strong> <a href="https://example.com">ссылка</a></p><script>alert(1)</script><img src="file:///etc/passwd"><a href="javascript:alert(1)">нет</a><ul><li>Пункт</li></ul>')
    sanitized = html_of(root)
    assert "script" not in sanitized and "file:" not in sanitized and "javascript:" not in sanitized
    with ZipFile(BytesIO(generate_docx("Отчёт", root))) as archive:
        xml = archive.read("word/document.xml").decode()
        assert "Кириллица" in xml and "Пункт" in xml and "hyperlink" in xml


def test_docx_export_permissions_and_download_headers(client, users):
    owner, member, outsider, space, board, columns, task = setup_team(client, users)
    doc = client.post("/documents", json={"title": "Русский документ", "workspace_id": space}, headers=auth_header(owner)).json()
    url = f"/documents/{doc['id']}/export?format=docx"
    assert client.get(url, headers=auth_header(outsider)).status_code == 404
    response = client.get(url, headers=auth_header(member))
    assert response.status_code == 200 and response.content.startswith(b"PK")
    assert response.headers["cache-control"] == "no-store"
    assert "filename*=UTF-8" in response.headers["content-disposition"]
    assert client.get(url.replace("docx", "invalid"), headers=auth_header(member)).status_code == 422


@pytest.mark.skipif(sys.platform == "win32", reason="PDF system libraries are provided by the Linux Docker image")
def test_pdf_export_supports_saved_cyrillic_content(client, users):
    owner = users()
    headers = auth_header(owner)
    space = client.get("/workspaces", headers=headers).json()[0]["id"]
    doc = client.post("/documents", json={"title": "Русский отчёт", "workspace_id": space}, headers=headers).json()
    client.post(f"/documents/{doc['id']}/versions", json={"title": doc["title"], "content": "<h2>Глава</h2><p>Кириллица и форматирование</p>", "expected_revision": doc["revision"]}, headers=headers)
    response = client.get(f"/documents/{doc['id']}/export?format=pdf", headers=headers)
    assert response.status_code == 200 and response.content.startswith(b"%PDF")
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["cache-control"] == "no-store"


def test_secure_session_lifetime_expiry_and_invalid_credentials(client, users, monkeypatch):
    user = users()
    monkeypatch.setattr(settings, "cookie_secure", True)
    result = client.post("/auth/login", json=credentials(client, user["login"], "Integration123!"))
    cookie = result.headers["set-cookie"].lower()
    assert "secure" in cookie and "max-age" not in cookie
    headers = {"Cookie": "ethereal_session=" + result.cookies.get("ethereal_session"), "X-CSRF-Token": result.json()["csrf_token"]}

    async def expire():
        from sqlalchemy import text
        engine = create_async_engine(settings.database_url, poolclass=NullPool)
        try:
            async with engine.begin() as connection:
                await connection.execute(text("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=:id"), {"id": user["id"]})
        finally:
            await engine.dispose()

    asyncio.run(expire())
    assert client.get("/auth/me", headers=headers).status_code == 401
    failed = client.post("/auth/login", json=credentials(client, user["login"], "WrongPassword"))
    assert failed.status_code == 401 and failed.json()["code"] == "invalid_credentials"
    client.cookies.clear()


def test_patch_column_logs_move_and_notifies_assignee(client, users):
    owner, member, outsider, space, board, columns, task = setup_team(client, users)
    response = client.patch(f"/tasks/{task['id']}", json={"column_id": columns[1]["id"], "expected_revision": task["revision"]}, headers=auth_header(owner))
    assert response.status_code == 200
    feed = client.get("/notifications", headers=auth_header(member)).json()
    assert [item["kind"] for item in feed["items"]].count("task.move") == 1


def test_export_preserves_custom_numbering_and_clean_heading_styles():
    root = parse_content('<ol start="3"><li>Третий</li><li>Четвёртый</li></ol>')
    assert 'counter-reset:list-item 2' in html_of(root)
    with ZipFile(BytesIO(generate_docx("Отчёт", root))) as archive:
        numbering = archive.read("word/numbering.xml").decode()
        assert 'w:val="3"' in numbering
        assert 'Третий' in archive.read("word/document.xml").decode()
