"""Create a reproducible local demonstration using the public API."""
import argparse
import base64
import json
import os
from http.cookiejar import CookieJar
from urllib.request import Request, build_opener, HTTPCookieProcessor
from urllib.error import HTTPError

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

PASSWORD = "Demo123!"


class Client:
    def __init__(self, base):
        self.base = base
        self.opener = build_opener(HTTPCookieProcessor(CookieJar()))
        self.csrf = ""

    def call(self, path, method="GET", body=None):
        headers = {"Content-Type": "application/json", "X-CSRF-Token": self.csrf}
        request = Request(self.base + path, method=method, headers=headers,
                          data=json.dumps(body).encode() if body is not None else None)
        with self.opener.open(request) as response:
            data = response.read()
            return json.loads(data) if data else None

    def login(self, login):
        info = self.call("/auth/public-key")
        key = serialization.load_der_public_key(base64.b64decode(info["public_key"]))
        aes, nonce = os.urandom(32), os.urandom(12)
        envelope = {"login": login, "key_id": info["key_id"],
            "encrypted_key": base64.b64encode(key.encrypt(aes, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))).decode(),
            "nonce": base64.b64encode(nonce).decode(), "encrypted_password": base64.b64encode(AESGCM(aes).encrypt(nonce, PASSWORD.encode(), None)).decode()}
        try:
            auth = self.call("/auth/register", "POST", {**envelope, "consent": True, "consent_version": self.call("/auth/privacy")["consent_version"]})
        except HTTPError as error:
            if error.code != 400:
                raise
            auth = self.call("/auth/login", "POST", envelope)
        self.csrf = auth["csrf_token"]
        return auth["user"]


def seed(base):
    if not base.startswith(("http://127.0.0.1:", "http://localhost:")):
        raise ValueError("Use a local demo API, not a public server")
    owner, member = Client(base), Client(base)
    owner.login("demo_owner")
    assigned = member.login("demo_member")
    space = owner.call("/workspaces", "POST", {"name": "Демонстрация Ethereal"})
    owner.call(f"/workspaces/{space['id']}/members", "POST", {"login": assigned["login"]})
    board = owner.call("/boards", "POST", {"title": "Подготовка к защите", "workspace_id": space["id"]})
    columns = [owner.call(f"/boards/{board['id']}/columns", "POST", {"title": title}) for title in ("План", "В работе", "Готово")]
    tasks = []
    for index, title in enumerate(("Проверить регистрацию и согласие", "Подготовить демонстрацию", "Обновить руководство пользователя")):
        tasks.append(owner.call("/tasks", "POST", {"board_id": board["id"], "column_id": columns[index]["id"], "title": title,
            "description": "Демонстрационная задача для проверки совместной работы.", "assignee_id": assigned["id"]}))
    member.call(f"/tasks/{tasks[0]['id']}/move", "POST", {"column_id": columns[1]["id"], "expected_revision": tasks[0]["revision"]})
    doc = owner.call("/documents", "POST", {"title": "План демонстрации", "workspace_id": space["id"]})
    for content in ("<h2>Подготовка</h2><p>Открыть проект и проверить роли.</p>",
        "<h2>Подготовка к защите</h2><p>Проект <strong>Ethereal</strong> объединяет задачи и документы.</p><ul><li>Показать согласие при регистрации</li><li>Переместить свою задачу</li><li>Экспортировать документ</li></ul><blockquote><p>Все изменения сохраняются с проверкой версии.</p></blockquote><p><em>Форматы экспорта:</em> PDF и DOCX.</p>"):
        doc = owner.call(f"/documents/{doc['id']}/versions", "POST", {"title": doc["title"], "content": content, "expected_revision": doc["revision"]})
    print(json.dumps({"workspace_id": space["id"], "board_id": board["id"], "document_id": doc["id"], "task_id": tasks[0]["id"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    seed(parser.parse_args().api.rstrip("/"))
