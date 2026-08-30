import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings


def auth_header(user):
    return {"Authorization": f"Bearer {user['token']}"}


def test_register_session_and_default_workspace(client, users):
    user = users()

    me = client.get("/auth/me", headers=auth_header(user))
    spaces = client.get("/workspaces", headers=auth_header(user))

    assert me.status_code == 200
    assert me.json()["id"] == user["id"]
    assert spaces.status_code == 200
    assert len(spaces.json()) == 1
    assert spaces.json()[0]["role"] == "owner"

    logout = client.post("/auth/logout", headers=auth_header(user))
    assert logout.status_code == 204
    assert client.get("/auth/me", headers=auth_header(user)).status_code == 401


def test_workspace_roles_and_lifecycle(client, users):
    owner = users()
    admin = users()
    member = users()
    headers = auth_header(owner)
    initial = client.get("/workspaces", headers=headers).json()[0]

    assert client.delete(f"/workspaces/{initial['id']}", headers=headers).status_code == 400
    workspace = client.post("/workspaces", json={"name": "Команда"}, headers=headers)
    assert workspace.status_code == 201
    workspace_id = workspace.json()["id"]
    assert workspace.json()["role"] == "owner"

    renamed = client.patch(
        f"/workspaces/{workspace_id}",
        json={"name": "Команда 2"},
        headers=headers,
    )
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Команда 2"

    for user in (admin, member):
        response = client.post(
            f"/workspaces/{workspace_id}/members",
            json={"login": user["login"]},
            headers=headers,
        )
        assert response.status_code == 201

    role = client.patch(
        f"/workspaces/{workspace_id}/members/{admin['id']}",
        json={"role": "admin"},
        headers=headers,
    )
    assert role.status_code == 200
    assert role.json()["role"] == "admin"
    assert client.patch(
        f"/workspaces/{workspace_id}/members/{owner['id']}",
        json={"role": "member"},
        headers=headers,
    ).status_code == 400
    assert client.patch(
        f"/workspaces/{workspace_id}",
        json={"name": "Нет"},
        headers=auth_header(admin),
    ).status_code == 403
    assert client.patch(
        f"/workspaces/{workspace_id}/members/{member['id']}",
        json={"role": "admin"},
        headers=auth_header(admin),
    ).status_code == 403

    board = client.post("/boards", json={"title": "Доска", "workspace_id": workspace_id}, headers=headers).json()
    document = client.post(
        "/documents",
        json={"title": "Документ", "workspace_id": workspace_id},
        headers=headers,
    ).json()
    assert client.delete(f"/boards/{board['id']}", headers=auth_header(member)).status_code == 403
    assert client.delete(f"/documents/{document['id']}", headers=auth_header(member)).status_code == 403
    assert client.delete(f"/workspaces/{workspace_id}", headers=auth_header(admin)).status_code == 403
    assert client.delete(f"/workspaces/{workspace_id}", headers=headers).status_code == 204
    assert client.get(f"/boards/{board['id']}", headers=headers).status_code == 404
    assert client.get(f"/documents/{document['id']}", headers=headers).status_code == 404


def test_workspace_data_isolation_and_document_versions(client, users):
    owner = users()
    outsider = users()
    member = users()
    headers = auth_header(owner)
    workspace_id = client.post("/workspaces", json={"name": "Private"}, headers=headers).json()["id"]
    board = client.post("/boards", json={"title": "Доска", "workspace_id": workspace_id}, headers=headers).json()
    task = client.post("/tasks", json={"board_id": board["id"], "title": "Задача"}, headers=headers).json()
    document = client.post("/documents", json={"title": "Документ", "workspace_id": workspace_id}, headers=headers).json()
    version = client.post(
        f"/documents/{document['id']}/versions",
        json={"title": "Версия 1", "content": "private"},
        headers=headers,
    ).json()
    version_id = version["versions"][0]["id"]
    outsider_headers = auth_header(outsider)

    protected = [
        ("get", f"/workspaces/{workspace_id}/members", None),
        ("get", f"/workspaces/{workspace_id}/activity", None),
        ("get", f"/boards/{board['id']}", None),
        ("get", f"/tasks/{task['id']}", None),
        ("get", f"/documents/{document['id']}", None),
        ("patch", f"/tasks/{task['id']}", {"title": "x"}),
        ("delete", f"/documents/{document['id']}", None),
        ("post", f"/documents/{document['id']}/versions", {"title": "x", "content": "x"}),
        ("post", f"/documents/{document['id']}/restore/{version_id}", None),
    ]
    for method, path, body in protected:
        response = client.request(method.upper(), path, json=body, headers=outsider_headers)
        assert response.status_code == 404, (method, path, response.text)

    assert client.post(
        f"/workspaces/{workspace_id}/members",
        json={"login": member["login"]},
        headers=headers,
    ).status_code == 201
    member_headers = auth_header(member)
    assert client.get(f"/boards/{board['id']}", headers=member_headers).status_code == 200
    assert client.post(
        f"/documents/{document['id']}/versions",
        json={"title": "Версия 2", "content": "updated"},
        headers=member_headers,
    ).status_code == 200
    restored = client.post(
        f"/documents/{document['id']}/restore/{version_id}",
        headers=member_headers,
    )
    assert restored.status_code == 200
    assert restored.json()["title"] == "Версия 1"
    assert len(restored.json()["versions"]) == 1


def test_task_assignee_must_be_workspace_member(client, users):
    owner = users()
    outsider = users()
    headers = auth_header(owner)
    workspace_id = client.get("/workspaces", headers=headers).json()[0]["id"]
    board = client.post("/boards", json={"title": "Доска", "workspace_id": workspace_id}, headers=headers).json()

    response = client.post(
        "/tasks",
        json={"board_id": board["id"], "title": "Задача", "assignee_id": outsider["id"]},
        headers=headers,
    )
    assert response.status_code == 404


def test_database_schema_is_at_current_migration():
    async def read_schema():
        test_engine = create_async_engine(settings.database_url, poolclass=NullPool)
        try:
            async with test_engine.connect() as connection:
                revision = (await connection.execute(text("select version_num from alembic_version"))).scalar_one()
                tables = set(
                    (
                        await connection.execute(
                            text(
                                "select table_name from information_schema.tables "
                                "where table_schema = 'public'"
                            )
                        )
                    )
                    .scalars()
                    .all()
                )
                return revision, tables
        finally:
            await test_engine.dispose()

    revision, tables = asyncio.run(read_schema())
    assert revision == "f2a4d0e95b23"
    assert {"workspaces", "workspace_members", "activity_logs"} <= tables
