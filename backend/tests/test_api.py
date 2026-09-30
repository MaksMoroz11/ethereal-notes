import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from uuid import UUID

from app.config import settings
from conftest import credentials


def auth_header(user):
    return {"Authorization": f"Bearer {user['token']}"}


def add_column(client, board, headers, title="Открыта"):
    response = client.post(f"/boards/{board['id']}/columns", json={"title": title}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


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
    column = add_column(client, board, headers)
    task = client.post("/tasks", json={"board_id": board["id"], "column_id": column["id"], "title": "Задача"}, headers=headers).json()
    UUID(task["id"])
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
    ).status_code == 403
    assert client.post(
        f"/documents/{document['id']}/versions",
        json={"title": "Версия 2", "content": "updated"},
        headers=headers,
    ).status_code == 200
    restored = client.post(
        f"/documents/{document['id']}/restore/{version_id}",
        headers=headers,
    )
    assert restored.status_code == 200
    assert restored.json()["title"] == "Версия 1"
    assert len(restored.json()["versions"]) == 1
    activity = client.get(f"/workspaces/{workspace_id}/activity", headers=headers)
    assert activity.status_code == 200
    assert {item["action"] for item in activity.json()} >= {
        "workspace.create",
        "board.create",
        "task.create",
        "document.create",
        "document.version",
        "document.restore",
    }


def test_task_assignee_must_be_workspace_member(client, users):
    owner = users()
    outsider = users()
    headers = auth_header(owner)
    workspace_id = client.get("/workspaces", headers=headers).json()[0]["id"]
    board = client.post("/boards", json={"title": "Доска", "workspace_id": workspace_id}, headers=headers).json()
    column = add_column(client, board, headers)

    response = client.post(
        "/tasks",
        json={"board_id": board["id"], "column_id": column["id"], "title": "Задача", "assignee_id": outsider["id"]},
        headers=headers,
    )
    assert response.status_code == 404


def test_task_assignee_can_be_set_and_cleared_for_workspace_member(client, users):
    owner = users()
    member = users()
    headers = auth_header(owner)
    workspace_id = client.get("/workspaces", headers=headers).json()[0]["id"]
    assert client.post(
        f"/workspaces/{workspace_id}/members",
        json={"login": member["login"]},
        headers=headers,
    ).status_code == 201
    board = client.post(
        "/boards",
        json={"title": "Доска", "workspace_id": workspace_id},
        headers=headers,
    ).json()
    column = add_column(client, board, headers)
    task = client.post(
        "/tasks",
        json={"board_id": board["id"], "column_id": column["id"], "title": "Задача", "assignee_id": member["id"]},
        headers=headers,
    )
    assert task.status_code == 201
    assert task.json()["assignee_id"] == member["id"]

    cleared = client.patch(
        f"/tasks/{task.json()['id']}",
        json={"assignee_id": None},
        headers=headers,
    )
    assert cleared.status_code == 200
    assert cleared.json()["assignee_id"] is None


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
    assert revision == "c92f01a7de34"
    assert {"workspaces", "workspace_members", "activity_logs", "folders", "board_columns"} <= tables


def test_columns_visibility_search_and_folder_tree(client, users):
    owner, admin, member = users(), users(), users()
    headers = auth_header(owner)
    workspace_id = client.get("/workspaces", headers=headers).json()[0]["id"]
    for other in (admin, member):
        assert client.post(f"/workspaces/{workspace_id}/members", json={"login": other["login"]}, headers=headers).status_code == 201
    assert client.patch(f"/workspaces/{workspace_id}/members/{admin['id']}", json={"role": "admin"}, headers=headers).status_code == 200

    root = client.post("/folders", json={"workspace_id": workspace_id, "title": "Проект"}, headers=headers).json()
    nested = client.post("/folders", json={"workspace_id": workspace_id, "parent_id": root["id"], "title": "Планы"}, headers=headers).json()
    document_root = client.post("/folders", json={"workspace_id": workspace_id, "title": "Тексты", "kind": "document"}, headers=headers).json()
    assert root["kind"] == nested["kind"] == "board"
    assert document_root["kind"] == "document"
    assert [folder["id"] for folder in client.get(f"/folders?workspace_id={workspace_id}&kind=document", headers=headers).json()] == [document_root["id"]]
    assert client.patch(f"/folders/{root['id']}", json={"parent_id": nested["id"]}, headers=headers).status_code == 400
    board = client.post("/boards", json={"workspace_id": workspace_id, "title": "Доска", "folder_id": nested["id"]}, headers=headers).json()
    assert client.post("/boards", json={"workspace_id": workspace_id, "title": "Неверная папка", "folder_id": document_root["id"]}, headers=headers).status_code == 404
    document = client.post("/documents", json={"workspace_id": workspace_id, "title": "Материал", "folder_id": document_root["id"]}, headers=headers)
    assert document.status_code == 201
    found_document = client.get(f"/search?workspace_id={workspace_id}&q=Материал", headers=headers)
    assert found_document.status_code == 200
    assert found_document.json()[0]["user_login"] == owner["login"]
    assert found_document.json()[0]["folder_id"] == document_root["id"]
    assert client.post("/documents", json={"workspace_id": workspace_id, "title": "Неверная папка", "folder_id": root["id"]}, headers=headers).status_code == 404
    assert board["columns"] == []
    first = add_column(client, board, headers, "Очередь")
    second = add_column(client, board, headers, "Делаю")
    assert client.patch(f"/boards/{board['id']}/columns/{second['id']}", json={"position": 0}, headers=headers).status_code == 200
    assigned = client.post("/tasks", json={"board_id": board["id"], "column_id": first["id"], "title": "секретный текст", "assignee_id": member["id"]}, headers=headers).json()
    own = client.post("/tasks", json={"board_id": board["id"], "column_id": first["id"], "title": "мой текст", "assignee_id": owner["id"]}, headers=headers).json()
    assert [task["id"] for task in client.get(f"/boards/{board['id']}", headers=auth_header(member)).json()["tasks"]] == [assigned["id"]]
    assert client.get(f"/tasks/{own['id']}", headers=auth_header(member)).status_code == 404
    assert client.patch(f"/tasks/{assigned['id']}", json={"title": "нельзя"}, headers=auth_header(member)).status_code == 403
    assert [task["id"] for task in client.get(f"/boards/{board['id']}", headers=headers).json()["tasks"]] == [own["id"]]
    assert len(client.get(f"/boards/{board['id']}?all_tasks=true", headers=auth_header(admin)).json()["tasks"]) == 2
    assert len(client.get(f"/search?workspace_id={workspace_id}&q=секретный", headers=auth_header(member)).json()) == 1
    assert client.get(f"/search?workspace_id={workspace_id}&q=мой", headers=auth_header(member)).json() == []
    assert client.delete(f"/boards/{board['id']}/columns/{first['id']}", headers=headers).status_code == 400
    assert client.delete(f"/boards/{board['id']}/columns/{first['id']}?delete_tasks=true", headers=headers).status_code == 400
    assert client.delete(f"/boards/{board['id']}/columns/{first['id']}?target_column_id={second['id']}", headers=headers).status_code == 204
    assert client.get(f"/tasks/{assigned['id']}", headers=headers).json()["column_id"] == second["id"]
    assert client.delete(f"/boards/{board['id']}/columns/{second['id']}", headers=headers).status_code == 400
    assert client.delete(f"/boards/{board['id']}/columns/{second['id']}?delete_tasks=true", headers=headers).status_code == 204
    assert client.get(f"/tasks/{assigned['id']}", headers=headers).status_code == 404
    assert client.delete(f"/folders/{root['id']}", headers=headers).status_code == 400
    assert client.post("/folders", json={"workspace_id": workspace_id, "title": "Запрещено"}, headers=auth_header(member)).status_code == 403


def test_encrypted_login_and_other_users_document_update_keep_session(client, users):
    owner, viewer = users(), users()
    headers = auth_header(owner)
    workspace_id = client.get("/workspaces", headers=headers).json()[0]["id"]
    assert client.post(f"/workspaces/{workspace_id}/members", json={"login": viewer["login"]}, headers=headers).status_code == 201
    document = client.post("/documents", json={"workspace_id": workspace_id, "title": "Черновик"}, headers=headers).json()
    UUID(document["id"])
    before = client.get(f"/documents/{document['id']}", headers=auth_header(viewer))
    assert before.status_code == 200
    saved = client.post(f"/documents/{document['id']}/versions", json={"title": "Черновик", "content": "новый текст"}, headers=headers)
    assert saved.status_code == 200
    assert len(saved.json()["versions"]) == 1
    repeated = client.post(f"/documents/{document['id']}/versions", json={"title": "Черновик", "content": "новый текст"}, headers=headers)
    assert repeated.status_code == 200
    assert len(repeated.json()["versions"]) == 1
    assert client.get("/auth/me", headers=auth_header(viewer)).status_code == 200
    assert client.get(f"/documents/{document['id']}", headers=auth_header(viewer)).json()["content"] == "новый текст"
    assert client.post("/auth/login", json={"login": owner["login"], "password": "Integration123!"}).status_code == 422
    assert client.post("/auth/login", json=credentials(client, owner["login"], "Integration123!")).status_code == 200
