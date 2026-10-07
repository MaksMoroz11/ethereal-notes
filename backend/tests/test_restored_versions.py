from conftest import auth_header


def test_restore_appends_linked_version_with_actor_and_preserves_history(client, users):
    owner, admin, member = users(), users(), users()
    headers = auth_header(owner)
    space = client.get("/workspaces", headers=headers).json()[0]["id"]
    for user in (admin, member):
        client.post(f"/workspaces/{space}/members", json={"login": user["login"]}, headers=headers)
    client.patch(f"/workspaces/{space}/members/{admin['id']}", json={"role": "admin"}, headers=headers)
    doc = client.post("/documents", json={"title": "Document", "workspace_id": space}, headers=headers).json()
    path = f"/documents/{doc['id']}"
    for title, content in (("Первая", "Первый текст"), ("Вторая", "Второй текст")):
        doc = client.post(path + "/versions", json={"title": title, "content": content, "expected_revision": doc["revision"]}, headers=headers).json()
    original = doc["versions"]
    first, second = original[1], original[0]

    def restore(source, actor, current):
        result = client.post(path + f"/restore/{source['id']}", json={"expected_revision": current["revision"]}, headers=auth_header(actor))
        assert result.status_code == 200, result.text
        saved = result.json()
        assert saved["revision"] > current["revision"]
        assert saved["versions"][1:] == current["versions"]
        assert saved["versions"][0]["restored_from_id"] == source["id"]
        assert saved["versions"][0]["author_login"] == actor["login"]
        assert saved["updated_by"] == actor["login"]
        assert saved["title"] == source["title"] and saved["content"] == source["content"]
        return saved

    third = restore(first, admin, doc)
    fourth = restore(second, owner, third)
    fifth = restore(third["versions"][0], admin, fourth)
    assert len(fifth["versions"]) == 5
    assert fifth["versions"][-2:] == original
    assert fifth["versions"][0]["restored_from_id"] == third["versions"][0]["id"]
    assert client.get(path, headers=auth_header(member)).json()["versions"] == fifth["versions"]

    # Restoring the current text also records an explicit restore action.
    sixth = restore(fifth["versions"][0], owner, fifth)
    assert len(sixth["versions"]) == 6
    activity = client.get(f"/workspaces/{space}/activity", headers=headers).json()
    assert sum(item["action"] == "document.restore" for item in activity) == 4

    # Self-references must not prevent deletion of the complete document.
    assert client.delete(path, headers=headers).status_code == 204
    assert client.get(path, headers=headers).status_code == 404


def test_restore_rejects_foreign_version_member_and_stale_revision(client, users):
    owner, member = users(), users()
    headers = auth_header(owner)
    space = client.get("/workspaces", headers=headers).json()[0]["id"]
    client.post(f"/workspaces/{space}/members", json={"login": member["login"]}, headers=headers)
    documents = []
    for title in ("First", "Other"):
        doc = client.post("/documents", json={"title": title, "workspace_id": space}, headers=headers).json()
        doc = client.post(f"/documents/{doc['id']}/versions", json={"title": title, "content": "Saved", "expected_revision": doc["revision"]}, headers=headers).json()
        documents.append(doc)
    doc, other = documents
    version_id = doc["versions"][0]["id"]
    path = f"/documents/{doc['id']}/restore/"
    body = {"expected_revision": doc["revision"]}
    assert client.post(path + str(version_id), json=body, headers=auth_header(member)).status_code == 403
    assert client.post(path + str(other["versions"][0]["id"]), json=body, headers=headers).status_code == 404
    saved = client.post(path + str(version_id), json=body, headers=headers).json()
    conflict = client.post(path + str(version_id), json=body, headers=headers)
    assert conflict.status_code == 409 and conflict.json()["code"] == "revision_conflict"
    assert client.get(f"/documents/{doc['id']}", headers=headers).json() == saved
